'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Calendar, 
  DollarSign,
  Shield,
  MessageSquare,
  Phone,
  Mail,
  CheckCircle,
  AlertCircle,
  Eye,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PropertyMap } from '@/components/GoogleMap';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { propertyService, applicationService } from '@/services/api';
import { formatCurrency, formatDate, getBoroughDisplayName, getPropertyTypeDisplayName } from '@/lib/utils';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [property, setProperty] = useState<any>(null);
  const [nearbyProperties, setNearbyProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showVirtualTour, setShowVirtualTour] = useState(false);

  useEffect(() => {
    if (id) {
      loadProperty();
    }
  }, [id]);

  const loadProperty = async () => {
    try {
      const [propertyResponse, nearbyResponse] = await Promise.all([
        propertyService.getProperty(id as string),
        propertyService.getNearbyProperties(id as string).catch(() => ({ data: [] }))
      ]);
      
      setProperty(propertyResponse.data);
      setNearbyProperties(nearbyResponse.data || []);
      
      // Check if property is saved
      if (isAuthenticated && user?.userType === 'RENTER') {
        checkIfSaved(propertyResponse.data.id);
      }
    } catch (error: any) {
      console.error('Error loading property:', error);
      if (error.response?.status === 404) {
        router.push('/properties');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkIfSaved = async (propertyId: string) => {
    try {
      const response = await propertyService.getSavedProperties();
      const saved = response.data.some((p: any) => p.id === propertyId);
      setIsSaved(saved);
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    setSaving(true);
    try {
      const response = await propertyService.saveProperty(property.id);
      setIsSaved(response.saved);
      toast({
        title: response.saved ? 'Property Saved' : 'Property Removed',
        description: response.saved 
          ? 'Property added to your saved list'
          : 'Property removed from your saved list',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Unable to save property. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApply = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (user?.userType !== 'RENTER') {
      toast({
        title: 'Access Denied',
        description: 'Only renters can apply for properties.',
        variant: 'destructive'
      });
      return;
    }

    router.push(`/apply/${property.id}`);
  };

  const handleContact = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    router.push(`/messages?recipient=${property.owner.id}&property=${property.id}`);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: `Check out this property: ${property.title}`,
          url: window.location.href
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link Copied',
        description: 'Property link copied to clipboard',
        variant: 'default'
      });
    }
  };

  const handleScheduleViewing = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    // Implementation for scheduling viewing
    toast({
      title: 'Feature Coming Soon',
      description: 'Property viewing scheduling will be available soon.',
      variant: 'default'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-64 md:h-96 bg-gray-200 rounded-lg mb-8"></div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Property Not Found</h1>
            <p className="text-gray-600 mb-8">The property you're looking for doesn't exist or has been removed.</p>
            <Button asChild>
              <Link href="/properties">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Properties
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Button>
        </div>

        {/* Image Gallery */}
        <div className="mb-8">
          <div className="grid grid-cols-4 gap-4 h-64 md:h-96">
            <div className="col-span-4 md:col-span-3">
              <div className="relative h-full rounded-lg overflow-hidden">
                <Image
                  src={property.photos[selectedImageIndex] || '/placeholder-property.jpg'}
                  alt={property.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 75vw"
                />
                
                {/* Virtual Tour Button */}
                {property.virtualTourUrl && (
                  <Button
                    onClick={() => setShowVirtualTour(true)}
                    className="absolute bottom-4 left-4 bg-white/90 hover:bg-white text-gray-900"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    360° Virtual Tour
                  </Button>
                )}
              </div>
            </div>
            <div className="hidden md:block space-y-4">
              {property.photos.slice(0, 3).map((photo: string, index: number) => (
                <div
                  key={index}
                  className={`relative h-20 rounded-lg overflow-hidden cursor-pointer border-2 ${
                    selectedImageIndex === index ? 'border-blue-500' : 'border-transparent'
                  }`}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <Image
                    src={photo}
                    alt={`Property ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                </div>
              ))}
              {property.photos.length > 3 && (
                <div className="relative h-20 rounded-lg overflow-hidden bg-gray-900 bg-opacity-75 flex items-center justify-center text-white text-sm cursor-pointer">
                  +{property.photos.length - 3} more
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Property Header */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {property.title}
                  </h1>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span>{property.address}, {getBoroughDisplayName(property.borough)}, {property.zipCode}</span>
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
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
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Available {formatDate(property.availableDate)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                  {user?.userType === 'RENTER' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSave}
                      disabled={saving}
                    >
                      <Heart className={`h-4 w-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {getPropertyTypeDisplayName(property.propertyType)}
                </span>
                {!property.isBrokerFee && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    No Broker Fee
                  </span>
                )}
                {property.isRentStabilized && (
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                    Rent Stabilized
                  </span>
                )}
                {property.petPolicy && (
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                    Pet Friendly
                  </span>
                )}
                {property.furnished && (
                  <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                    Furnished
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
              <div className="prose max-w-none text-gray-700">
                {property.description.split('\n').map((paragraph: string, index: number) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Amenities */}
            {property.amenities.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(showAllAmenities ? property.amenities : property.amenities.slice(0, 9)).map((amenity: string, index: number) => (
                    <div key={index} className="flex items-center text-gray-700">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm">{amenity}</span>
                    </div>
                  ))}
                </div>
                {property.amenities.length > 9 && (
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowAllAmenities(!showAllAmenities)}
                    className="mt-4"
                  >
                    {showAllAmenities ? 'Show Less' : `Show All ${property.amenities.length} Amenities`}
                  </Button>
                )}
              </div>
            )}

            {/* FARE Act Disclosure */}
            {property.feeDisclosure && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Fee Disclosure (FARE Act Compliant)</h3>
                <div className="text-sm text-blue-800 whitespace-pre-line">
                  {property.feeDisclosure}
                </div>
              </div>
            )}

            {/* Location & Map */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Location & Neighborhood</h2>
              <PropertyMap 
                property={{
                  address: `${property.address}, ${getBoroughDisplayName(property.borough)}, NY ${property.zipCode}`,
                  latitude: property.latitude,
                  longitude: property.longitude,
                  title: property.title,
                  rentAmount: property.rentAmount
                }}
                nearbyProperties={nearbyProperties}
                showNearby={true}
              />
            </div>

            {/* Lease Terms */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Lease Information</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-500">Lease Term</div>
                  <div className="font-medium">{property.leaseTerm || '12 months'}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-500">Pet Policy</div>
                  <div className="font-medium">{property.petPolicy || 'No Pets'}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-500">Smoking</div>
                  <div className="font-medium">{property.smokingPolicy || 'No Smoking'}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-500">Parking</div>
                  <div className="font-medium">{property.parkingAvailable ? 'Available' : 'Not Available'}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-500">Utilities</div>
                  <div className="font-medium">
                    {property.utilitiesIncluded?.length > 0 
                      ? property.utilitiesIncluded.join(', ')
                      : 'Not Included'
                    }
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-500">Furnished</div>
                  <div className="font-medium">{property.furnished ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatCurrency(property.rentAmount)}
                <span className="text-lg font-normal text-gray-500">/month</span>
              </div>
              
              <div className="space-y-3 mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Security Deposit</span>
                  <span className="font-medium">{formatCurrency(property.securityDeposit)}</span>
                </div>
                {property.brokerFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Broker Fee</span>
                    <span className="font-medium">{formatCurrency(property.brokerFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Available Date</span>
                  <span className="font-medium">{formatDate(property.availableDate)}</span>
                </div>
              </div>

              {user?.userType === 'RENTER' && (
                <div className="mt-6 space-y-3">
                  <Button onClick={handleApply} className="w-full" disabled={applying}>
                    {applying ? 'Applying...' : 'Apply Now'}
                  </Button>
                  <Button onClick={handleContact} variant="outline" className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Landlord
                  </Button>
                  <Button onClick={handleScheduleViewing} variant="outline" className="w-full">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Viewing
                  </Button>
                </div>
              )}
            </div>

            {/* Landlord Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Owner</h3>
              
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  {property.owner.profileImage ? (
                    <Image
                      src={property.owner.profileImage}
                      alt={`${property.owner.firstName} ${property.owner.lastName}`}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-medium text-gray-600">
                      {property.owner.firstName[0]}{property.owner.lastName[0]}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
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

              <p className="text-sm text-gray-600 mb-4">
                Typically responds within 2 hours
              </p>

              {isAuthenticated ? (
                <Button onClick={handleContact} variant="outline" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              ) : (
                <Button asChild className="w-full">
                  <Link href="/login?redirect=" + encodeURIComponent(window.location.pathname)>
                    Sign in to Contact
                  </Link>
                </Button>
              )}
            </div>

            {/* Safety Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <h4 className="font-medium text-yellow-800 mb-1">Safety First</h4>
                  <p className="text-yellow-700">
                    Always meet in person before sending money. Never wire money or send personal financial information.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Virtual Tour Modal */}
      {showVirtualTour && property.virtualTourUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-4xl w-full h-3/4 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">360° Virtual Tour</h3>
              <Button variant="ghost" onClick={() => setShowVirtualTour(false)}>
                ✕
              </Button>
            </div>
            <iframe
              src={property.virtualTourUrl}
              className="w-full h-full rounded"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}