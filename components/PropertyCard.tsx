'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, MapPin, Bed, Bath, Square, Calendar, DollarSign, Shield, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { propertyService } from '@/services/api';
import { formatCurrency, getBoroughDisplayName, getPropertyTypeDisplayName } from '@/lib/utils';

interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    address: string;
    borough: string;
    propertyType: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet?: number;
    rentAmount: number;
    securityDeposit: number;
    availableDate: string;
    photos: string[];
    isRentStabilized: boolean;
    isBrokerFee: boolean;
    amenities: string[];
    owner: {
      id: string;
      firstName: string;
      lastName: string;
      profileImage?: string;
      verificationStatus: string;
      phone?: string;
    };
    _count?: {
      applications: number;
      savedBy: number;
    };
    distance?: number; // for location-based searches
  };
  showSaveButton?: boolean;
  onSave?: () => void;
  viewMode?: 'grid' | 'list';
}

export function PropertyCard({ 
  property, 
  showSaveButton = true, 
  onSave, 
  viewMode = 'grid' 
}: PropertyCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    setSaving(true);
    try {
      const response = await propertyService.saveProperty(property.id);
      setIsSaved(response.saved);
      onSave?.();
    } catch (error) {
      console.error('Error saving property:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleContact = (e: React.MouseEvent, contactType: 'message' | 'phone') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    if (contactType === 'message') {
      // Navigate to messaging
      window.location.href = `/messages/${property.owner.id}?property=${property.id}`;
    } else if (contactType === 'phone' && property.owner.phone) {
      window.open(`tel:${property.owner.phone}`);
    }
  };

  const primaryImage = property.photos?.[0] || '/placeholder-property.jpg';

  // List view layout
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden property-card-hover">
        <Link href={`/properties/${property.id}`} className="block">
          <div className="flex">
            {/* Image */}
            <div className="relative w-64 h-48 bg-gray-200 flex-shrink-0">
              <Image
                src={primaryImage}
                alt={property.title}
                fill
                className="object-cover"
                sizes="256px"
              />
              
              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col space-y-1">
                {!property.isBrokerFee && (
                  <span className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded">
                    No Fee
                  </span>
                )}
                {property.isRentStabilized && (
                  <span className="bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded">
                    Rent Stabilized
                  </span>
                )}
              </div>

              {/* Save Button */}
              {showSaveButton && user?.userType === 'RENTER' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-700 hover:text-red-500"
                >
                  <Heart className={`h-4 w-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  {/* Price */}
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {formatCurrency(property.rentAmount)}
                    <span className="text-lg font-normal text-gray-500">/month</span>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {property.title}
                  </h3>
                  
                  {/* Address */}
                  <div className="flex items-center text-gray-600 mb-3">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="text-base">
                      {property.address}, {getBoroughDisplayName(property.borough)}
                    </span>
                    {property.distance && (
                      <span className="ml-2 text-sm text-blue-600">
                        • {property.distance < 1 
                          ? `${Math.round(property.distance * 1000)}m away`
                          : `${property.distance.toFixed(1)}km away`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {user?.userType === 'RENTER' && (
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleContact(e, 'message')}
                      className="flex items-center gap-1"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Message
                    </Button>
                    {property.owner.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleContact(e, 'phone')}
                        className="flex items-center gap-1"
                      >
                        <Phone className="h-4 w-4" />
                        Call
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Property Details */}
              <div className="flex items-center space-x-6 text-gray-600 mb-4">
                <div className="flex items-center">
                  <Bed className="h-5 w-5 mr-2" />
                  <span className="text-base">{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center">
                  <Bath className="h-5 w-5 mr-2" />
                  <span className="text-base">{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
                </div>
                {property.squareFeet && (
                  <div className="flex items-center">
                    <Square className="h-5 w-5 mr-2" />
                    <span className="text-base">{property.squareFeet.toLocaleString()} sqft</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  <span className="text-base">Available {new Date(property.availableDate).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Amenities */}
              {property.amenities.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.slice(0, 8).map((amenity, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full"
                      >
                        {amenity}
                      </span>
                    ))}
                    {property.amenities.length > 8 && (
                      <span className="text-sm text-gray-500 px-3 py-1">
                        +{property.amenities.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Row */}
              <div className="flex items-center justify-between">
                {/* Owner Info */}
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    {property.owner.profileImage ? (
                      <Image
                        src={property.owner.profileImage}
                        alt={`${property.owner.firstName} ${property.owner.lastName}`}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-600">
                        {property.owner.firstName[0]}{property.owner.lastName[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-base font-medium text-gray-900">
                      {property.owner.firstName} {property.owner.lastName}
                    </div>
                    {property.owner.verificationStatus === 'VERIFIED' && (
                      <div className="flex items-center text-sm text-green-600">
                        <Shield className="h-4 w-4 mr-1" />
                        Verified Owner
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Security Deposit & Stats */}
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">Security Deposit</div>
                  <div className="text-lg font-semibold text-gray-900 mb-2">
                    {formatCurrency(property.securityDeposit)}
                  </div>
                  {property._count && (
                    <div className="text-sm text-gray-500">
                      {property._count.applications} applications • {property._count.savedBy} saved
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  // Grid view layout (default)
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden property-card-hover">
      <Link href={`/properties/${property.id}`} className="block">
        {/* Image */}
        <div className="relative h-48 bg-gray-200">
          <Image
            src={primaryImage}
            alt={property.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col space-y-1">
            {!property.isBrokerFee && (
              <span className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded">
                No Fee
              </span>
            )}
            {property.isRentStabilized && (
              <span className="bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded">
                Rent Stabilized
              </span>
            )}
          </div>

          {/* Save Button */}
          {showSaveButton && user?.userType === 'RENTER' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-700 hover:text-red-500"
            >
              <Heart className={`h-4 w-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Price */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(property.rentAmount)}
              <span className="text-base font-normal text-gray-500">/month</span>
            </div>
            {property._count && (
              <div className="text-sm text-gray-500">
                {property._count.applications} applications
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {property.title}
          </h3>

          {/* Address */}
          <div className="flex items-center text-gray-600 mb-3">
            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
            <span className="text-sm truncate">
              {property.address}, {getBoroughDisplayName(property.borough)}
            </span>
          </div>

          {/* Distance for location searches */}
          {property.distance && (
            <div className="text-sm text-blue-600 mb-2">
              {property.distance < 1 
                ? `${Math.round(property.distance * 1000)}m away`
                : `${property.distance.toFixed(1)}km away`}
            </div>
          )}

          {/* Property Details */}
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
            <div className="flex items-center">
              <Bed className="h-4 w-4 mr-1" />
              <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center">
              <Bath className="h-4 w-4 mr-1" />
              <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
            </div>
            {property.squareFeet && (
              <div className="flex items-center">
                <Square className="h-4 w-4 mr-1" />
                <span>{property.squareFeet.toLocaleString()} sqft</span>
              </div>
            )}
          </div>

          {/* Property Type and Available Date */}
          <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
            <span>{getPropertyTypeDisplayName(property.propertyType)}</span>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Available {new Date(property.availableDate).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Amenities Preview */}
          {property.amenities.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {property.amenities.slice(0, 3).map((amenity, index) => (
                  <span
                    key={index}
                    className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                  >
                    {amenity}
                  </span>
                ))}
                {property.amenities.length > 3 && (
                  <span className="text-xs text-gray-500 px-2 py-1">
                    +{property.amenities.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Contact Actions for Renters */}
          {user?.userType === 'RENTER' && (
            <div className="flex space-x-2 mb-3">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => handleContact(e, 'message')}
                className="flex-1 text-xs"
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Message
              </Button>
              {property.owner.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => handleContact(e, 'phone')}
                  className="flex-1 text-xs"
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Call
                </Button>
              )}
            </div>
          )}

          {/* Owner Info */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                {property.owner.profileImage ? (
                  <Image
                    src={property.owner.profileImage}
                    alt={`${property.owner.firstName} ${property.owner.lastName}`}
                    width={24}
                    height={24}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-gray-600">
                    {property.owner.firstName[0]}{property.owner.lastName[0]}
                  </span>
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {property.owner.firstName} {property.owner.lastName}
                </div>
                {property.owner.verificationStatus === 'VERIFIED' && (
                  <div className="flex items-center text-xs text-green-600">
                    <Shield className="h-3 w-3 mr-1" />
                    Verified
                  </div>
                )}
              </div>
            </div>
            
            {/* Security Deposit */}
            <div className="text-right">
              <div className="text-xs text-gray-500">Security Deposit</div>
              <div className="text-sm font-medium text-gray-900">
                {formatCurrency(property.securityDeposit)}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}