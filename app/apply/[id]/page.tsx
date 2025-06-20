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
  Loader2,
  X,
  Download,
  Trash2
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

  const addReference = () => {
    setApplicationData(prev => ({
      ...prev,
      references: [...prev.references, { name: '', relationship: '', phone: '', email: '' }]
    }));
  };

  const removeReference = (index: number) => {
    if (applicationData.references.length > 2) {
      setApplicationData(prev => ({
        ...prev,
        references: prev.references.filter((_, i) => i !== index)
      }));
    }
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

  const removeDocument = (documentType: string, index?: number) => {
    if (index !== undefined && (documentType === 'payStubs' || documentType === 'bankStatements')) {
      setApplicationData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [documentType]: (prev.documents[documentType as keyof typeof prev.documents] as string[])?.filter((_, i) => i !== index)
        }
      }));
    } else {
      setApplicationData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [documentType]: undefined
        }
      }));
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

          {/* Step 3: Documents */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Required Documents</h2>
              
              <div className="space-y-8">
                {/* ID Document */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Government-issued ID *
                  </label>
                  <p className="text-xs text-gray-500 mb-4">
                    Driver's license, passport, or state ID
                  </p>
                  
                  {applicationData.documents.idDocument ? (
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-sm text-green-800">ID document uploaded</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument('idDocument')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'idDocument');
                        }}
                        className="hidden"
                        id="id-upload"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                        disabled={uploadingFiles.includes('idDocument')}
                      >
                        <label htmlFor="id-upload" className="cursor-pointer">
                          {uploadingFiles.includes('idDocument') ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            'Choose File'
                          )}
                        </label>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Pay Stubs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recent Pay Stubs * (Last 2-3 months)
                  </label>
                  
                  <div className="space-y-2">
                    {applicationData.documents.payStubs?.map((stub, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-green-600 mr-2" />
                          <span className="text-sm text-green-800">Pay stub {index + 1}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument('payStubs', index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'payStubs');
                        }}
                        className="hidden"
                        id="paystub-upload"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                        disabled={uploadingFiles.includes('payStubs')}
                      >
                        <label htmlFor="paystub-upload" className="cursor-pointer">
                          {uploadingFiles.includes('payStubs') ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            'Add Pay Stub'
                          )}
                        </label>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Bank Statements */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Statements (Optional but recommended)
                  </label>
                  
                  <div className="space-y-2">
                    {applicationData.documents.bankStatements?.map((statement, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-blue-600 mr-2" />
                          <span className="text-sm text-blue-800">Bank statement {index + 1}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument('bankStatements', index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'bankStatements');
                        }}
                        className="hidden"
                        id="bank-upload"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                        disabled={uploadingFiles.includes('bankStatements')}
                      >
                        <label htmlFor="bank-upload" className="cursor-pointer">
                          {uploadingFiles.includes('bankStatements') ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            'Add Bank Statement'
                          )}
                        </label>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: References */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">References</h2>
              <p className="text-gray-600">Please provide at least 2 references who can vouch for your character and reliability.</p>
              
              <div className="space-y-6">
                {applicationData.references.map((reference, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-6 relative">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Reference {index + 1}</h3>
                      {applicationData.references.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeReference(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <Input
                          placeholder="Reference's full name"
                          value={reference.name}
                          onChange={(e) => updateReference(index, 'name', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Relationship *
                        </label>
                        <Input
                          placeholder="e.g., Previous landlord, employer, friend"
                          value={reference.relationship}
                          onChange={(e) => updateReference(index, 'relationship', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number *
                        </label>
                        <Input
                          placeholder="(555) 123-4567"
                          value={reference.phone}
                          onChange={(e) => updateReference(index, 'phone', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <Input
                          type="email"
                          placeholder="reference@email.com"
                          value={reference.email}
                          onChange={(e) => updateReference(index, 'email', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  onClick={addReference}
                  className="w-full"
                >
                  Add Another Reference
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Review and Consent */}
          {currentStep === 5 && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold text-gray-900">Review & Submit</h2>
              
              {/* Application Summary */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Summary</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Move-in Date:</span>
                      <span className="ml-2 font-medium">{formatDate(applicationData.moveInDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Monthly Income:</span>
                      <span className="ml-2 font-medium">{formatCurrency(applicationData.monthlyIncome)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Employer:</span>
                      <span className="ml-2 font-medium">{applicationData.employmentInfo.employer}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Position:</span>
                      <span className="ml-2 font-medium">{applicationData.employmentInfo.position}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Documents:</span>
                      <span className="ml-2 font-medium">
                        {Object.values(applicationData.documents).filter(Boolean).length} uploaded
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">References:</span>
                      <span className="ml-2 font-medium">{applicationData.references.length} provided</span>
                    </div>
                  </div>
                </div>

                {/* Background Check Consent */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Background Check Authorization</h3>
                  
                  <div className="space-y-4">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={applicationData.creditCheckConsent}
                        onChange={(e) => updateApplicationData('creditCheckConsent', e.target.checked)}
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">Credit Check Authorization *</span>
                        <p className="text-gray-600 mt-1">
                          I authorize the landlord to obtain my credit report for the purpose of evaluating this rental application. 
                          There will be a $35 fee for the credit check.
                        </p>
                      </div>
                    </label>
                    
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={applicationData.backgroundCheckConsent}
                        onChange={(e) => updateApplicationData('backgroundCheckConsent', e.target.checked)}
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">Background Check Authorization *</span>
                        <p className="text-gray-600 mt-1">
                          I authorize the landlord to conduct a background check for the purpose of evaluating this rental application.
                          This may include criminal history and eviction records.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <h4 className="font-medium text-yellow-800 mb-2">Important Information</h4>
                      <ul className="text-yellow-700 space-y-1">
                        <li>• Application fees are non-refundable</li>
                        <li>• Background and credit checks will be processed within 24-48 hours</li>
                        <li>• You will be notified of the decision via email and platform messaging</li>
                        <li>• Submitting an application does not guarantee approval</li>
                      </ul>
                    </div>
                  </div>
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
