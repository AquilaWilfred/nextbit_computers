// ── Daraja Escrow Service ──────────────────────────────────────────────────────
// Core business logic implementing the flowchart exactly:
//
//   ORDER INITIATED
//     → PAYMENT PENDING          (stk_push_payment)
//     → FUNDS_HELD_IN_ESCROW     (on_stk_callback / on_c2b_confirmation)
//       → HAS BUYER RAISED DISPUTE?
//           NO  → DELIVERY CONFIRMED?
//                   YES → PAYMENT CONFIRMED, SELLER PAID OUT (release_to_seller)
//                   NO  → back to FUNDS_HELD_IN_ESCROW
//           YES → SUPER ADMIN REVIEWED?
//                   NO  → WAITING
//                   YES → WHO WAS FAVOURED?
//                           SELLER → FUND RELEASED TO THE SELLER (release_to_seller)
//                           CLIENT → MONEY REFUNDED (refund_to_buyer)

use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::daraja_escrow::{
    DarajaError, DarajaEscrowRecord, DarajaEscrowResponse, DarajaPaymentInitiated,
    normalise_phone,
};
use crate::models::escrow::{EscrowAction, EscrowState};
use crate::services::daraja::DarajaClient;
use crate::services::daraja::c2b::StkCallbackData;
use crate::services::daraja::b2c::B2cResultBody;
use crate::services::daraja::tax_remittance::{compute_tax_kes, TaxType};
use crate::services::escrow::{apply_transition, get_escrow, save_fw_tx_ref};
use crate::services::fee::compute_platform_fee_cents;

// ── KRA shortcode (sandbox) ────────────────────────────────────────────────────
const KRA_SHORTCODE_SANDBOX: &str = "572572";

// ── Read ───────────────────────────────────────────────────────────────────────

pub async fn get_daraja_record(
    pool:      &PgPool,
    escrow_id: Uuid,
) -> Result<DarajaEscrowRecord, DarajaError> {
    sqlx::query_as::<_, DarajaEscrowRecord>(
        r#"SELECT * FROM daraja_escrow_records WHERE escrow_id = $1"#,
    )
    .bind(escrow_id)
    .fetch_one(pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => DarajaError::NotFound(escrow_id),
        other => DarajaError::Database(other),
    })
}

pub async fn get_daraja_record_by_checkout_id(
    pool:        &PgPool,
    checkout_id: &str,
) -> Result<DarajaEscrowRecord, DarajaError> {
    sqlx::query_as::<_, DarajaEscrowRecord>(
        r#"SELECT * FROM daraja_escrow_records WHERE mpesa_checkout_id = $1"#,
    )
    .bind(checkout_id)
    .fetch_one(pool)
    .await
    .map_err(|e| DarajaError::Database(e))
}

pub async fn get_daraja_record_by_b2c_originator(
    pool:           &PgPool,
    originator_id:  &str,
) -> Result<DarajaEscrowRecord, DarajaError> {
    sqlx::query_as::<_, DarajaEscrowRecord>(
        r#"SELECT * FROM daraja_escrow_records WHERE b2c_originator_id = $1"#,
    )
    .bind(originator_id)
    .fetch_one(pool)
    .await
    .map_err(|e| DarajaError::Database(e))
}

// ── 1. Initiate Payment via STK Push ──────────────────────────────────────────
// Buyer hits "Pay with M-Pesa" → we push STK to their phone.
// Transitions: Created → PaymentPending

pub async fn stk_push_payment(
    pool:        &PgPool,
    daraja:      &DarajaClient,
    escrow_id:   Uuid,
    buyer_id:    Uuid,
    buyer_phone: &str,
) -> Result<DarajaPaymentInitiated, DarajaError> {
    let escrow = get_escrow(pool, escrow_id)
        .await
        .map_err(|e| DarajaError::Http(e.to_string()))?;

    // Guard: only allow from Created state
    if escrow.state != EscrowState::Created {
        return Err(DarajaError::InvalidState(format!(
            "Expected Created, got {:?}",
            escrow.state
        )));
    }

    let phone = normalise_phone(buyer_phone)?;

    // Convert NUMERIC amount to whole KES (Daraja doesn't accept decimals)
    let amount_kes: u64 = escrow
        .amount
        .to_string()
        .parse::<f64>()
        .map(|f| f.round() as u64)
        .map_err(|_| DarajaError::Http("Invalid amount in escrow".into()))?;

    // Compute fees for the daraja_escrow_records row
    let gross_cents = (amount_kes * 100) as i64;
    let fee_cents = compute_platform_fee_cents(gross_cents);
    let tax_cents = (compute_tax_kes(amount_kes, &TaxType::WithholdingTax) * 100) as i64;
    let net_cents = gross_cents - fee_cents - tax_cents;

    // Push STK
    let stk_resp = daraja
        .stk_push(&phone, amount_kes, &escrow_id.to_string(), "NextBit Escrow Payment")
        .await?;

    // Transition escrow to PaymentPending
    apply_transition(
        pool,
        escrow_id,
        EscrowAction::InitiatePayment,
        Some(buyer_id),
        Some(json!({ "checkout_request_id": stk_resp.checkout_request_id })),
    )
    .await
    .map_err(|e| DarajaError::Http(e.to_string()))?;

    // Upsert daraja_escrow_records row
    sqlx::query(
        r#"
        INSERT INTO daraja_escrow_records
            (escrow_id, mpesa_checkout_id, mpesa_merchant_id, buyer_phone,
             gross_amount_cents, fee_cents, tax_cents, net_amount_cents,
             stk_push_initiated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (escrow_id) DO UPDATE SET
            mpesa_checkout_id   = EXCLUDED.mpesa_checkout_id,
            mpesa_merchant_id   = EXCLUDED.mpesa_merchant_id,
            buyer_phone         = EXCLUDED.buyer_phone,
            gross_amount_cents  = EXCLUDED.gross_amount_cents,
            fee_cents           = EXCLUDED.fee_cents,
            tax_cents           = EXCLUDED.tax_cents,
            net_amount_cents    = EXCLUDED.net_amount_cents,
            stk_push_initiated_at = NOW()
        "#,
    )
    .bind(escrow_id)
    .bind(&stk_resp.checkout_request_id)
    .bind(&stk_resp.merchant_request_id)
    .bind(&phone)
    .bind(gross_cents)
    .bind(fee_cents)
    .bind(tax_cents)
    .bind(net_cents)
    .execute(pool)
    .await?;

    Ok(DarajaPaymentInitiated {
        escrow_id,
        checkout_request_id: stk_resp.checkout_request_id,
        message: "Check your phone for M-Pesa payment prompt".into(),
    })
}

// ── 2. STK Push Callback Handler ──────────────────────────────────────────────
// Daraja calls our /daraja/stk/callback after buyer enters PIN.
// result_code == 0 → PaymentConfirmed → FundsHeldInEscrow
// result_code != 0 → PaymentFailed → back to Created

pub async fn on_stk_callback(
    pool:     &PgPool,
    callback: StkCallbackData,
) -> Result<(), DarajaError> {
    // Find the daraja record by CheckoutRequestID
    let record = get_daraja_record_by_checkout_id(
        pool,
        &callback.checkout_request_id,
    )
    .await?;

    if callback.result_code == 0 {
        // Success — extract receipt from metadata
        let receipt = callback
            .callback_metadata
            .as_ref()
            .and_then(|m| m.mpesa_receipt());

        // Update daraja record
        sqlx::query(
            r#"
            UPDATE daraja_escrow_records
            SET mpesa_receipt        = $1,
                payment_confirmed_at = NOW()
            WHERE escrow_id = $2
            "#,
        )
        .bind(&receipt)
        .bind(record.escrow_id)
        .execute(pool)
        .await?;

        // Transition: PaymentPending → FundsHeldInEscrow
        apply_transition(
            pool,
            record.escrow_id,
            EscrowAction::PaymentConfirmed,
            None,
            Some(json!({
                "mpesa_receipt": receipt,
                "checkout_request_id": callback.checkout_request_id,
            })),
        )
        .await
        .map_err(|e| DarajaError::Http(e.to_string()))?;
    } else {
        // Payment failed or cancelled
        apply_transition(
            pool,
            record.escrow_id,
            EscrowAction::PaymentFailed,
            None,
            Some(json!({
                "result_code": callback.result_code,
                "result_desc": callback.result_desc,
            })),
        )
        .await
        .map_err(|e| DarajaError::Http(e.to_string()))?;
    }

    Ok(())
}

// ── 3. C2B Confirmation Handler ───────────────────────────────────────────────
// For paybill/till flow (buyer pays manually rather than via STK push).
// bill_ref_number is the escrow_id the buyer enters as account reference.

pub async fn on_c2b_confirmation(
    pool:        &PgPool,
    escrow_id:   Uuid,
    trans_id:    &str,   // Mpesa receipt
    phone:       &str,
    amount_kes:  u64,
) -> Result<(), DarajaError> {
    let escrow = get_escrow(pool, escrow_id)
        .await
        .map_err(|e| DarajaError::Http(e.to_string()))?;

    // Verify amount matches
    let expected: u64 = escrow
        .amount
        .to_string()
        .parse::<f64>()
        .map(|f| f.round() as u64)
        .unwrap_or(0);

    if amount_kes != expected {
        return Err(DarajaError::AmountMismatch {
            expected,
            actual: amount_kes,
        });
    }

    // Upsert daraja record with receipt
    sqlx::query(
        r#"
        INSERT INTO daraja_escrow_records
            (escrow_id, mpesa_receipt, buyer_phone,
             gross_amount_cents, fee_cents, tax_cents, net_amount_cents,
             payment_confirmed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (escrow_id) DO UPDATE SET
            mpesa_receipt        = EXCLUDED.mpesa_receipt,
            buyer_phone          = EXCLUDED.buyer_phone,
            payment_confirmed_at = NOW()
        "#,
    )
    .bind(escrow_id)
    .bind(trans_id)
    .bind(phone)
    .bind((amount_kes * 100) as i64)
    .bind(compute_platform_fee_cents((amount_kes * 100) as i64))
    .bind((compute_tax_kes(amount_kes, &TaxType::WithholdingTax) * 100) as i64)
    .bind((amount_kes * 100) as i64)  // recalculated net below if needed
    .execute(pool)
    .await?;

    // Transition to FundsHeldInEscrow
    apply_transition(
        pool,
        escrow_id,
        EscrowAction::PaymentConfirmed,
        None,
        Some(json!({ "mpesa_receipt": trans_id })),
    )
    .await
    .map_err(|e| DarajaError::Http(e.to_string()))?;

    Ok(())
}

// ── 4. Release to Seller ───────────────────────────────────────────────────────
// Called when:
//   a) Buyer confirmed delivery → DeliveryConfirmed → release
//   b) Admin rules for seller → ReleasedToSeller → payout
//
// Flow:
//   1. Remit tax to KRA (async — result arrives in /daraja/tax/result callback)
//   2. B2C net amount to seller phone

pub async fn release_to_seller(
    pool:          &PgPool,
    daraja:        &DarajaClient,
    escrow_id:     Uuid,
    seller_phone:  &str,
    kra_shortcode: Option<&str>,
    tax_account_ref: Option<&str>,
) -> Result<(), DarajaError> {
    let record = get_daraja_record(pool, escrow_id).await?;
    let phone = normalise_phone(seller_phone)?;

    let net_kes = (record.net_amount_cents / 100) as u64;
    let tax_kes = (record.tax_cents / 100) as u64;

    // Step 1: Remit tax to KRA if applicable
    if tax_kes > 0 {
        let kra_sc = kra_shortcode.unwrap_or(KRA_SHORTCODE_SANDBOX);
        let tax_ref = tax_account_ref.unwrap_or("ESCROW_TAX");

        let tax_ack = daraja
            .remit_tax(&escrow_id.to_string(), tax_kes, kra_sc, tax_ref)
            .await?;

        // Save tax conversation ID — actual receipt arrives in /daraja/tax/result
        sqlx::query(
            r#"
            UPDATE daraja_escrow_records
            SET tax_conversation_id = $1,
                tax_amount_cents    = $2
            WHERE escrow_id = $3
            "#,
        )
        .bind(&tax_ack.conversation_id)
        .bind(record.tax_cents)
        .bind(escrow_id)
        .execute(pool)
        .await?;
    }

    // Step 2: B2C payment to seller
    let b2c_ack = daraja
        .b2c_payment(
            &escrow_id.to_string(),
            &phone,
            net_kes,
            "BusinessPayment",
            &format!("NextBit escrow payout {}", escrow_id),
        )
        .await?;

    // Save B2C conversation ID — receipt arrives in /daraja/b2c/result
    sqlx::query(
        r#"
        UPDATE daraja_escrow_records
        SET b2c_conversation_id  = $1,
            b2c_originator_id    = $2,
            b2c_recipient_phone  = $3,
            payout_initiated_at  = NOW()
        WHERE escrow_id = $4
        "#,
    )
    .bind(&b2c_ack.conversation_id)
    .bind(&b2c_ack.originator_conversation_id)
    .bind(&phone)
    .bind(escrow_id)
    .execute(pool)
    .await?;

    Ok(())
}

// ── 5. Refund to Buyer ────────────────────────────────────────────────────────
// Called when admin rules for buyer or auto-refund conditions are met.

pub async fn refund_to_buyer(
    pool:        &PgPool,
    daraja:      &DarajaClient,
    escrow_id:   Uuid,
    buyer_phone: &str,
) -> Result<(), DarajaError> {
    let record = get_daraja_record(pool, escrow_id).await?;
    let phone = normalise_phone(buyer_phone)?;

    // Refund the full gross amount (no fee deduction on refunds)
    let refund_kes = (record.gross_amount_cents / 100) as u64;

    let b2c_ack = daraja
        .b2c_payment(
            &format!("refund-{}", escrow_id),
            &phone,
            refund_kes,
            "BusinessPayment",
            &format!("NextBit escrow refund {}", escrow_id),
        )
        .await?;

    sqlx::query(
        r#"
        UPDATE daraja_escrow_records
        SET b2c_conversation_id = $1,
            b2c_originator_id   = $2,
            b2c_recipient_phone = $3,
            refund_initiated_at = NOW()
        WHERE escrow_id = $4
        "#,
    )
    .bind(&b2c_ack.conversation_id)
    .bind(&b2c_ack.originator_conversation_id)
    .bind(&phone)
    .bind(escrow_id)
    .execute(pool)
    .await?;

    Ok(())
}

// ── 6. B2C Result Callback Handler ────────────────────────────────────────────
// Daraja calls /daraja/b2c/result after processing the B2C.
// We complete the escrow state transition here.

pub async fn on_b2c_result(
    pool:   &PgPool,
    result: B2cResultBody,
) -> Result<(), DarajaError> {
    let originator_id = &result.originator_conversation_id;

    // Determine if this is a refund (prefixed "refund-") or a payout
    let is_refund = originator_id.starts_with("refund-");

    let escrow_id_str = if is_refund {
        originator_id.trim_start_matches("refund-")
    } else {
        originator_id.as_str()
    };

    let escrow_id = escrow_id_str
        .parse::<Uuid>()
        .map_err(|_| DarajaError::Http(format!("Invalid escrow_id in originator: {}", originator_id)))?;

    if result.is_success() {
        if is_refund {
            sqlx::query(
                r#"
                UPDATE daraja_escrow_records
                SET b2c_receipt        = $1,
                    refund_completed_at = NOW()
                WHERE escrow_id = $2
                "#,
            )
            .bind(&result.transaction_i_d)
            .bind(escrow_id)
            .execute(pool)
            .await?;

            // Escrow was already transitioned to Refunded by admin_ruling —
            // nothing more to do here, receipt is now recorded.

        } else {
            sqlx::query(
                r#"
                UPDATE daraja_escrow_records
                SET b2c_receipt         = $1,
                    payout_completed_at = NOW()
                WHERE escrow_id = $2
                "#,
            )
            .bind(&result.transaction_i_d)
            .bind(escrow_id)
            .execute(pool)
            .await?;

            // Final transition: ReleasedToSeller → PayoutCompleted
            apply_transition(
                pool,
                escrow_id,
                EscrowAction::ReleaseFunds,
                None,
                Some(serde_json::json!({ "b2c_receipt": result.transaction_i_d })),
            )
            .await
            .map_err(|e| DarajaError::Http(e.to_string()))?;
        }
    } else {
        // B2C failed — log it, alert ops, do NOT auto-retry (manual intervention needed)
        tracing::error!(
            escrow_id = %escrow_id,
            result_code = result.result_code,
            result_desc = %result.result_desc,
            "B2C payment failed — manual intervention required"
        );
    }

    Ok(())
}

// ── 7. Tax Result Callback ─────────────────────────────────────────────────────

pub async fn on_tax_result(
    pool:             &PgPool,
    conversation_id:  &str,
    receipt:          &str,
    is_success:       bool,
) -> Result<(), DarajaError> {
    sqlx::query(
        r#"
        UPDATE daraja_escrow_records
        SET tax_receipt     = $1,
            tax_remitted_at = CASE WHEN $2 THEN NOW() ELSE NULL END
        WHERE tax_conversation_id = $3
        "#,
    )
    .bind(receipt)
    .bind(is_success)
    .bind(conversation_id)
    .execute(pool)
    .await?;

    if !is_success {
        tracing::error!(
            conversation_id = %conversation_id,
            "Tax remittance failed — manual KRA remittance required"
        );
    }

    Ok(())
}