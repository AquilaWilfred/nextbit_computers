"use client";

import { FC } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star, ArrowRight } from 'lucide-react';
import { CardProduct } from '@/types/nextbit-wallet/cards.types';

interface CardProductCardProps {
  product: CardProduct;
  onApply: (productId: string) => void;
}

export const CardProductCard: FC<CardProductCardProps> = ({ product, onApply }) => {
  return (
    <Card className={`hover:shadow-xl transition-all duration-300 overflow-hidden ${product.popular ? "ring-2 ring-purple-500" : ""}`}>
      <div className={`h-32 bg-gradient-to-r ${product.colorScheme.bg} p-4`}>
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              NextBit × Visa
            </div>
            <div className="text-lg font-bold text-white mt-1">{product.name}</div>
          </div>
          <div className="text-2xl font-bold italic text-white/90">VISA</div>
        </div>
        {product.popular && (
          <Badge className="mt-2 bg-yellow-400 text-yellow-900 font-semibold">
            <Star className="h-3 w-3 mr-1 fill-current" /> Most Popular
          </Badge>
        )}
      </div>
      <CardContent className="p-5">
        <div className="mb-4">
          <div className="text-2xl font-bold text-gray-800">KES {product.fees.annual.toLocaleString()}</div>
          <div className="text-xs text-gray-500">annual fee</div>
        </div>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" /> Key Features
            </h4>
            <ul className="space-y-1">
              {product.features.slice(0, 3).map((feature, idx) => (
                <li key={idx} className="text-xs text-gray-600 flex items-center gap-1">
                  • {feature}
                </li>
              ))}
            </ul>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-grey-900 hover:text-white font-bold"
            onClick={() => onApply(product.id)}
          >
            Apply Now <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};