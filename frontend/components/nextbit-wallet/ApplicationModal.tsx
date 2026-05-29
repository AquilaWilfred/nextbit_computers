"use client";

import { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Loader2 } from 'lucide-react';
import { EMPLOYMENT_OPTIONS } from '@/constants/nextbit-wallet/cards.constants';

interface ApplicationModalProps {
  isOpen: boolean;
  productName: string;
  formData: {
    full_name?: string;
    id_number?: string;
    phone?: string;
    email?: string;
    employment?: string;
  };
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onFieldChange: (field: string, value: any) => void;
  isFieldDisabled?: (field: string) => boolean;
}

export const ApplicationModal: FC<ApplicationModalProps> = ({
  isOpen,
  productName,
  formData,
  submitting,
  onClose,
  onSubmit,
  onFieldChange,
  isFieldDisabled = () => false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600">
          <CardTitle className="text-white text-lg">
            Apply for {productName}
          </CardTitle>
          <p className="text-white/90 text-sm mt-1">Complete the form to get your virtual card instantly</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label className="text-gray-700 font-semibold">Full Name *</Label>
            <Input 
              value={formData.full_name || ''} 
              onChange={e => onFieldChange('full_name', e.target.value)} 
              placeholder="Enter your full name" 
              className="mt-1" 
              disabled={isFieldDisabled('full_name')}
            />
          </div>
          
          <div>
            <Label className="text-gray-700 font-semibold">ID Number *</Label>
            <Input 
              value={formData.id_number || ''} 
              onChange={e => onFieldChange('id_number', e.target.value)} 
              placeholder="Enter your ID number" 
              className="mt-1" 
            />
          </div>
          
          <div>
            <Label className="text-gray-700 font-semibold">Phone Number *</Label>
            <Input 
              value={formData.phone || ''} 
              onChange={e => onFieldChange('phone', e.target.value)} 
              placeholder="e.g., +254712345678" 
              className="mt-1"
              disabled={isFieldDisabled('phone')}
            />
          </div>
          
          <div>
            <Label className="text-gray-700 font-semibold">Email Address *</Label>
            <Input 
              type="email" 
              value={formData.email || ''} 
              onChange={e => onFieldChange('email', e.target.value)} 
              placeholder="Enter your email" 
              className="mt-1"
              disabled={isFieldDisabled('email')}
            />
          </div>
          
          <div>
            <Label className="text-gray-700 font-semibold">Employment Status</Label>
            <Select 
              value={formData.employment || 'employed'} 
              onValueChange={value => onFieldChange('employment', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select employment status" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" /> What happens next?
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Instant virtual card issuance upon approval</li>
              <li>• Physical card delivered within 5–7 business days</li>
              <li>• 24/7 customer support</li>
              <li>• Zero liability protection</li>
            </ul>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={onSubmit} 
              disabled={submitting} 
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-grey-900 hover:text-white font-semibold"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit Application
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1 text-gray-700 border-gray-300"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};