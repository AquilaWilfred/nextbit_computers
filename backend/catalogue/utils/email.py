import smtplib
import secrets
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_email(to: str, subject: str, html: str) -> bool:
    try:
        # Main function block starts here 
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from}>"
        msg["To"] = to
        
        # Inner try block for plain text 
        try:
            plain = re.sub(r'<[^<]+?>', '', html)
            plain = re.sub(r'\s+', ' ', plain).strip()
        except Exception:
            plain = subject
            
        msg.attach(MIMEText(plain, "plain"))
        msg.attach(MIMEText(html, "html"))
        
        # Inner try block for headers 
        try:
            msg["Reply-To"] = settings.smtp_from
            msg["List-Unsubscribe"] = f"<mailto:{settings.smtp_from}>"
        except Exception:
            pass

        # SMTP Connection block 
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()  # Best practice: Re-identify after starting TLS
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, to, msg.as_string())
            
        return True
        
    except Exception as e:
        print(f"[email] Failed to send to {to}: {e}")
        return False

def send_verification_email(to: str, name: str, token: str) -> bool:
    # Generate a 6-digit code from token for manual entry
    code = ''.join([str(ord(c) % 10) for c in token[:6]]).ljust(6, '0')[:6]
    
    verify_url = f"{settings.frontend_url}/verify-email?token={token}"
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - NextBit Computers</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f8f9fa; padding: 20px 0; margin: 0;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e8ecf1;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0055FF 0%, #00D4FF 100%); padding: 48px 32px; text-align: center;">
          <div style="font-size: 32px; font-weight: 800; color: #fff; margin: 0; letter-spacing: -1px;">NextBit</div>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px; font-weight: 500;">East Africa's Trusted Tech Marketplace</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 48px 32px;">
          <h2 style="color: #1a1a1a; margin: 0 0 16px; font-size: 24px; font-weight: 700;">Hi {name},</h2>
          <p style="color: #475569; line-height: 1.8; margin: 0 0 24px; font-size: 16px;">
            Welcome to NextBit! We're excited to have you. To complete your account setup, please verify your email address.
          </p>
          
          <!-- Verification Code Section -->
          <div style="background: #f0f4ff; border-left: 4px solid #0055FF; border-radius: 8px; padding: 24px; margin: 32px 0; text-align: center;">
            <p style="color: #64748b; margin: 0 0 12px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
            <div style="font-size: 36px; font-weight: 800; letter-spacing: 4px; color: #0055FF; font-family: 'Monaco', 'Courier New', monospace; margin: 0;">{code}</div>
            <p style="color: #64748b; margin: 12px 0 0; font-size: 13px;">Enter this code in the app or click the button below</p>
          </div>
          
          <!-- Verify Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="{verify_url}"
               style="display: inline-block; background: linear-gradient(135deg, #0055FF, #00D4FF);
                      color: #fff; text-decoration: none; padding: 16px 48px;
                      border-radius: 8px; font-size: 16px; font-weight: 600;
                      box-shadow: 0 4px 12px rgba(0, 85, 255, 0.3);
                      transition: transform 0.2s, box-shadow 0.2s;">
              Verify Email Now
            </a>
          </div>
          
          <!-- Expiry Info -->
          <p style="color: #64748b; font-size: 13px; margin: 24px 0; text-align: center;">
            This code expires in <strong>24 hours</strong> for security
          </p>
          
          <!-- Security Notice -->
          <div style="background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #065f46; margin: 0; font-size: 13px;">
              <strong>🔒 Security Tip:</strong> NextBit will never ask for this code via email or phone. This code is for verification only.
            </p>
          </div>
          
          <!-- Troubleshooting -->
          <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0; line-height: 1.8;">
            <strong>Didn't create this account?</strong> You can safely ignore this email. Your account won't be activated without verification.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0 0 12px;">Questions? Contact us at support@nextbit.co.ke</p>
          <p style="color: #cbd5e1; font-size: 11px; margin: 8px 0 0;">
            © 2026 NextBit Computers · Nairobi, Kenya · All rights reserved
          </p>
          <p style="color: #cbd5e1; font-size: 11px; margin: 8px 0 0;">
            This is a transactional email. <a href="{settings.frontend_url}/privacy" style="color: #0055FF; text-decoration: none;">Privacy Policy</a>
          </p>
        </div>
      </div>
    </body>
    </html>
    """
    # Use a clear, non-spammy subject and include code in body
    return send_email(to, "Verify your NextBit email address", html)


def send_password_reset_email(to: str, name: str, token: str) -> bool:
    # Generate a 6-digit code from token for manual entry
    code = ''.join([str(ord(c) % 10) for c in token[:6]]).ljust(6, '0')[:6]
    
    reset_url = f"{settings.frontend_url}/auth?mode=reset-password&token={token}"
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - NextBit Computers</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f8f9fa; padding: 20px 0; margin: 0;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e8ecf1;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); padding: 48px 32px; text-align: center;">
          <div style="font-size: 32px; font-weight: 800; color: #fff; margin: 0; letter-spacing: -1px;">NextBit</div>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px; font-weight: 500;">Security: Password Reset Request</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 48px 32px;">
          <h2 style="color: #1a1a1a; margin: 0 0 16px; font-size: 24px; font-weight: 700;">Hi {name},</h2>
          <p style="color: #475569; line-height: 1.8; margin: 0 0 24px; font-size: 16px;">
            We received a request to reset your NextBit password. If you didn't make this request, you can safely ignore this email.
          </p>
          
          <!-- Reset Code Section -->
          <div style="background: #fff3e0; border-left: 4px solid #ff6b35; border-radius: 8px; padding: 24px; margin: 32px 0; text-align: center;">
            <p style="color: #e65100; margin: 0 0 12px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Reset Code</p>
            <div style="font-size: 36px; font-weight: 800; letter-spacing: 4px; color: #ff6b35; font-family: 'Monaco', 'Courier New', monospace; margin: 0;">{code}</div>
            <p style="color: #e65100; margin: 12px 0 0; font-size: 13px;">Enter this code or click the button below to reset your password</p>
          </div>
          
          <!-- Reset Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="{reset_url}"
               style="display: inline-block; background: linear-gradient(135deg, #ff6b35, #f7931e);
                      color: #fff; text-decoration: none; padding: 16px 48px;
                      border-radius: 8px; font-size: 16px; font-weight: 600;
                      box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
                      transition: transform 0.2s, box-shadow 0.2s;">
              Reset Password Now
            </a>
          </div>
          
          <!-- Expiry Info -->
          <p style="color: #64748b; font-size: 13px; margin: 24px 0; text-align: center;">
            This link expires in <strong>1 hour</strong> for security
          </p>
          
          <!-- Security Notice -->
          <div style="background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #7f1d1d; margin: 0; font-size: 13px;">
              <strong>⚠️ Security Alert:</strong> If you didn't request a password reset, your account may be compromised. Change your password immediately after regaining access.
            </p>
          </div>
          
          <!-- Safety Tips -->
          <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0; line-height: 1.8;">
            <strong>Stay Safe:</strong>
            <br/>• NextBit never asks for your password via email
            <br/>• Don't share this code with anyone
            <br/>• Use a strong, unique password
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0 0 12px;">Questions? Contact us at support@nextbit.co.ke</p>
          <p style="color: #cbd5e1; font-size: 11px; margin: 8px 0 0;">
            © 2026 NextBit Computers · Nairobi, Kenya · All rights reserved
          </p>
          <p style="color: #cbd5e1; font-size: 11px; margin: 8px 0 0;">
            This is a security email. <a href="{settings.frontend_url}/privacy" style="color: #ff6b35; text-decoration: none;">Privacy Policy</a>
          </p>
        </div>
      </div>
    </body>
    </html>
    """
    return send_email(to, "NextBit password reset request", html)
