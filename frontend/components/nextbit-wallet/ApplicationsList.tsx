"use client";

import { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardApplication } from '@/types/nextbit-wallet/cards.types';
import { CARD_STATUS_CONFIG } from '@/constants/nextbit-wallet/cards.constants';

interface ApplicationsListProps {
  applications: CardApplication[];
}

export const ApplicationsList: FC<ApplicationsListProps> = ({ applications }) => {
  if (applications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-800">Your Card Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            No card applications yet. Apply for your first NextBit Visa card above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-gray-800">Your Card Applications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {applications.map(app => {
            const statusConfig = CARD_STATUS_CONFIG[app.status as keyof typeof CARD_STATUS_CONFIG] || CARD_STATUS_CONFIG.pending;
            
            return (
              <div key={app.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-800">{app.cardType}</h3>
                    <p className="text-sm text-gray-500">Applied: {new Date(app.appliedAt).toLocaleDateString()}</p>
                  </div>
                  <Badge className={`font-semibold border-0 ${statusConfig.bg} ${statusConfig.text}`}>
                    {statusConfig.label}
                  </Badge>
                </div>
                {app.approvedAt && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Approved on {new Date(app.approvedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};