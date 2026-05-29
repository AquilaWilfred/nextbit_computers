"use client";

import { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { Transaction } from '@/types/nextbit-wallet/cards.types';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export const RecentTransactions: FC<RecentTransactionsProps> = ({ transactions }) => {
  if (transactions.length === 0) return null;

  return (
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Activity className="h-5 w-5 text-purple-600" /> Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {transactions.map(transaction => (
              <div key={transaction.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 border-b last:border-0 transition-colors">
                <div className="min-w-0">
                  <div className="font-medium text-sm text-gray-800">{transaction.merchant}</div>
                  <div className="flex flex-wrap gap-2 items-center text-xs text-gray-400">
                    <span>{transaction.date}</span>
                    <span className="font-mono text-[11px] text-gray-500">#{transaction.id.slice(0, 8)}</span>
                  </div>
                  {transaction.description && (
                    <div className="text-[11px] text-gray-500 mt-1 line-clamp-2">{transaction.description}</div>
                  )}
                </div>
                <div className={`font-bold text-sm ${transaction.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                  {transaction.amount > 0 ? "+" : ""}{transaction.amount.toLocaleString()} KES
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};