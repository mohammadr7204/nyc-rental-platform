'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ArrowRight,
  CheckCircle, 
  Upload,
  FileText,
  User,
  Briefcase,
  Home,
  CreditCard,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { propertyService, applicationService, uploadService } from '@/services/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ApplicationData {
  propertyId: string;
  moveInDate: string;
  monthlyIncome: number;
  employmentInfo: {
    employer: string;
    position: string;
    yearsEmployed: number;
    supervisorName: string;
    supervisorPhone: string;
    workAddress: string;
  };
  references: Array<{
    name: string;
    relationship: string;
    phone: string;
    email: string;
  }>;
  documents: {
    idDocument?: string;
    payStubs?: string[];
    bankStatements?: string[];
    employmentLetter?: string;
    previousLease?: string;
  };
  notes?: string;
  creditCheckConsent: boolean;
  backgroundCheckConsent: boolean;
}

const STEPS = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'Employment', icon: Briefcase },
  { id: 3, title: 'Documents', icon: FileText },
  { id: 4, title: 'References', icon: Home },
  { id: 5, title: 'Review', icon: CheckCircle }
];

export default function ApplicationPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  const [applicationData, setApplicationData] = useState<ApplicationData>({
    propertyId: id as string,
    moveInDate: '',
    monthlyIncome: 0,
    employmentInfo: {
      employer: '',
      position: '',
      yearsEmployed: 0,
      supervisorName: '',
      supervisorPhone: '',
      workAddress: ''
    },
    references: [
      { name: '', relationship: '', phone: '', email: '' },
      { name: '', relationship: '', phone: '', email: '' }
    ],
    documents: {},
    notes: '',
    creditCheckConsent: false,
    backgroundCheckConsent: false
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (user?.userType !== 'RENTER') {
      router.push('/properties');
      return;
    }

    if (id) {
      loadProperty();
    }
  }, [id, isAuthenticated, user]);

  const loadProperty = async () => {
    try {
      const response = await propertyService.getProperty(id as string);
      setProperty(response.data);
    } catch (error: any) {
      console.error('Error loading property:', error);
      if (error.response?.status === 404) {
        router.push('/properties');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationData = (field: string, value: any) => {
    setApplicationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateNestedData = (section: string, field: string, value: any) => {
    setApplicationData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof ApplicationData],
        [field]: value
      }
    }));
  };

  const updateReference = (index: number, field: string, value: string) => {
    setApplicationData(prev => ({
      ...prev,
      references: prev.references.map((ref, i) => 
        i === index ? { ...ref, [field]: value } : ref
      )
    }));
  };

  const handleFileUpload = async (file: File, documentType: string) => {
    setUploadingFiles(prev => [...prev, documentType]);
    
    try {
      const response = await uploadService.uploadSingle(file, 'applications');
      
      if (documentType === 'payStubs' || documentType === 'bankStatements') {
        setApplicationData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            [documentType]: [
              ...(prev.documents[documentType as keyof typeof prev.documents] as string[] || []),
              response.data.url
            ]
          }
        }));
      } else {
        setApplicationData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            [documentType]: response.data.url
          }
        }));
      }

      toast({
        title: 'Document Uploaded',
        description: 'Your document has been uploaded successfully.',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload document. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploadingFiles(prev => prev.filter(type => type !== documentType));
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(applicationData.moveInDate && applicationData.monthlyIncome > 0);
      case 2:
        const emp = applicationData.employmentInfo;
        return !!(emp.employer && emp.position && emp.yearsEmployed > 0);
      case 3:
        return !!(applicationData.documents.idDocument && 
                 applicationData.documents.payStubs?.length);
      case 4:
        return applicationData.references.every(ref => 
          ref.name && ref.relationship && ref.phone
        );
      case 5:
        return applicationData.creditCheckConsent && applicationData.backgroundCheckConsent;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    } else {
      toast({
        title: 'Please Complete Required Fields',
        description: 'All required fields must be filled before proceeding.',
        variant: 'destructive'
      });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const submitApplication = async () => {
    if (!validateStep(5)) {
      toast({
        title: 'Please Complete Application',
        description: 'All required fields and consents must be completed.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      await applicationService.submitApplication(applicationData);
      
      toast({
        title: 'Application Submitted!',
        description: 'Your rental application has been submitted successfully.',
        variant: 'default'
      });

      router.push('/dashboard?tab=applications');
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error.response?.data?.message || 'Failed to submit application. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Property Not Found</h1>
            <Button asChild>
              <Link href="/properties">Back to Properties</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Property
          </Button>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start space-x-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <Image
                  src={property.photos[0] || '/placeholder-property.jpg'}
                  alt={property.title}
                  fill
                  className="object-cover rounded-lg"
                  sizes="80px"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-gray-900 mb-1">
                  Apply for {property.title}
                </h1>
                <p className="text-gray-600 mb-2">{property.address}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{formatCurrency(property.rentAmount)}/month</span>
                  <span>Available {formatDate(property.availableDate)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted ? 'bg-green-500 border-green-500 text-white' :
                    isActive ? 'bg-blue-500 border-blue-500 text-white' :
                    'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-16 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((step) => (
              <span key={step.id} className="text-xs text-gray-500 text-center w-10">
                {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Personal Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Desired Move-in Date *
                  </label>
                  <Input
                    type="date"
                    value={applicationData.moveInDate}
                    onChange={(e) => updateApplicationData('moveInDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Income *
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter your monthly income"
                    value={applicationData.monthlyIncome || ''}
                    onChange={(e) => updateApplicationData('monthlyIncome', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 40x monthly rent ({formatCurrency(property.rentAmount * 40)})
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Tell the landlord more about yourself..."
                  value={applicationData.notes}
                  onChange={(e) => updateApplicationData('notes', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 2: Employment Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Employment Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employer Name *
                  </label>
                  <Input
                    placeholder="Company name"
                    value={applicationData.employmentInfo.employer}
                    onChange={(e) => updateNestedData('employmentInfo', 'employer', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title *
                  </label>
                  <Input
                    placeholder="Your position"
                    value={applicationData.employmentInfo.position}
                    onChange={(e) => updateNestedData('employmentInfo', 'position', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Years Employed *
                  </label>
                  <Input
                    type="number"
                    placeholder="Years at current job"
                    value={applicationData.employmentInfo.yearsEmployed || ''}
                    onChange={(e) => updateNestedData('employmentInfo', 'yearsEmployed', parseFloat(e.target.value) || 0)}
                    step="0.1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supervisor Name
                  </label>
                  <Input
                    placeholder="Supervisor's name"
                    value={applicationData.employmentInfo.supervisorName}
                    onChange={(e) => updateNestedData('employmentInfo', 'supervisorName', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supervisor Phone
                  </label>
                  <Input
                    placeholder="(555) 123-4567"
                    value={applicationData.employmentInfo.supervisorPhone}
                    onChange={(e) => updateNestedData('employmentInfo', 'supervisorPhone', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Address
                  </label>
                  <Input
                    placeholder="Company address"
                    value={applicationData.employmentInfo.workAddress}
                    onChange={(e) => updateNestedData('employmentInfo', 'workAddress', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            {currentStep < STEPS.length ? (
              <Button onClick={nextStep}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={submitApplication}
                disabled={submitting || !validateStep(5)}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
