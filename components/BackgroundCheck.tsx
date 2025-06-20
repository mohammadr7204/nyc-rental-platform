'use client';

import { useState } from 'react';
import { 
  Shield, 
  FileText, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  User,
  Phone,
  Mail,
  Building,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/contexts/ToastContext';

interface BackgroundCheckProps {
  applicationId: string;
  applicant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  onCheckInitiated: (checkId: string) => void;
  onCheckCompleted: (results: any) => void;
}

interface CheckResult {
  id: string;
  type: 'CREDIT' | 'BACKGROUND' | 'EVICTION';
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  score?: number;
  details: any;
  cost: number;
  initiatedAt: string;
  completedAt?: string;
}

export function BackgroundCheckComponent({ 
  applicationId, 
  applicant, 
  onCheckInitiated, 
  onCheckCompleted 
}: BackgroundCheckProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [consents, setConsents] = useState({
    creditCheck: false,
    backgroundCheck: false,
    evictionCheck: false
  });

  const initiateCheck = async (checkType: 'CREDIT' | 'BACKGROUND' | 'EVICTION') => {
    setLoading(prev => ({ ...prev, [checkType]: true }));
    
    try {
      // Simulate API call to background check service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResult: CheckResult = {
        id: `check_${Date.now()}`,
        type: checkType,
        status: 'PENDING',
        cost: checkType === 'CREDIT' ? 35 : checkType === 'BACKGROUND' ? 25 : 20,
        initiatedAt: new Date().toISOString(),
        details: {}
      };

      setChecks(prev => [...prev, mockResult]);
      onCheckInitiated(mockResult.id);

      toast({
        title: 'Background Check Initiated',
        description: `${checkType.toLowerCase()} check has been started. Results will be available in 24-48 hours.`,
        variant: 'default'
      });

      // Simulate check completion after a delay
      setTimeout(() => {
        completeCheck(mockResult.id, checkType);
      }, 5000);

    } catch (error) {
      toast({
        title: 'Check Failed',
        description: `Failed to initiate ${checkType.toLowerCase()} check. Please try again.`,
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, [checkType]: false }));
    }
  };

  const completeCheck = (checkId: string, checkType: 'CREDIT' | 'BACKGROUND' | 'EVICTION') => {
    const mockResults = {
      CREDIT: {
        score: 720,
        details: {
          creditHistory: 'Good',
          paymentHistory: '95% on-time payments',
          debtToIncomeRatio: 0.25,
          inquiries: 2,
          accounts: 8,
          remarks: 'Strong credit profile with minimal inquiries'
        }
      },
      BACKGROUND: {
        details: {
          criminalHistory: 'None found',
          employmentVerification: 'Verified',
          addressHistory: 'Confirmed',
          identityVerification: 'Verified',
          remarks: 'Clean background check with verified employment'
        }
      },
      EVICTION: {
        details: {
          evictionHistory: 'None found',
          courtRecords: 'No rental-related court cases',
          previousLandlordContact: 'Positive reference',
          remarks: 'No eviction history found'
        }
      }
    };

    setChecks(prev => prev.map(check => 
      check.id === checkId 
        ? { 
            ...check, 
            status: 'COMPLETED' as const,
            completedAt: new Date().toISOString(),
            ...mockResults[checkType]
          }
        : check
    ));

    onCheckCompleted({ checkId, type: checkType, ...mockResults[checkType] });

    toast({
      title: 'Check Completed',
      description: `${checkType.toLowerCase()} check results are now available.`,
      variant: 'default'
    });
  };

  const getCheckIcon = (type: string) => {
    switch (type) {
      case 'CREDIT': return CreditCard;
      case 'BACKGROUND': return Shield;
      case 'EVICTION': return FileText;
      default: return Shield;
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 700) return 'text-green-600';
    if (score >= 600) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Background Screening</h3>
        <p className="text-gray-600">
          Verify applicant information and assess rental risk for {applicant.firstName} {applicant.lastName}
        </p>
      </div>

      {/* Applicant Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Applicant Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center">
            <User className="h-4 w-4 text-gray-400 mr-2" />
            <span>{applicant.firstName} {applicant.lastName}</span>
          </div>
          <div className="flex items-center">
            <Mail className="h-4 w-4 text-gray-400 mr-2" />
            <span>{applicant.email}</span>
          </div>
          {applicant.phone && (
            <div className="flex items-center">
              <Phone className="h-4 w-4 text-gray-400 mr-2" />
              <span>{applicant.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Available Checks */}
      <div className="space-y-4 mb-6">
        <h4 className="font-medium text-gray-900">Available Screening Services</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Credit Check */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-medium">Credit Check</span>
              </div>
              <span className="text-sm text-gray-500">$35</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              FICO score, payment history, debt analysis
            </p>
            <Button
              onClick={() => initiateCheck('CREDIT')}
              disabled={loading.CREDIT || checks.some(c => c.type === 'CREDIT')}
              className="w-full"
              size="sm"
            >
              {loading.CREDIT ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Initiating...
                </>
              ) : checks.some(c => c.type === 'CREDIT') ? (
                'Check Initiated'
              ) : (
                'Run Credit Check'
              )}
            </Button>
          </div>

          {/* Background Check */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-medium">Background Check</span>
              </div>
              <span className="text-sm text-gray-500">$25</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Criminal history, identity verification
            </p>
            <Button
              onClick={() => initiateCheck('BACKGROUND')}
              disabled={loading.BACKGROUND || checks.some(c => c.type === 'BACKGROUND')}
              className="w-full"
              size="sm"
            >
              {loading.BACKGROUND ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Initiating...
                </>
              ) : checks.some(c => c.type === 'BACKGROUND') ? (
                'Check Initiated'
              ) : (
                'Run Background Check'
              )}
            </Button>
          </div>

          {/* Eviction Check */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-purple-600 mr-2" />
                <span className="font-medium">Eviction Check</span>
              </div>
              <span className="text-sm text-gray-500">$20</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Eviction history, rental court records
            </p>
            <Button
              onClick={() => initiateCheck('EVICTION')}
              disabled={loading.EVICTION || checks.some(c => c.type === 'EVICTION')}
              className="w-full"
              size="sm"
            >
              {loading.EVICTION ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Initiating...
                </>
              ) : checks.some(c => c.type === 'EVICTION') ? (
                'Check Initiated'
              ) : (
                'Run Eviction Check'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Check Results */}
      {checks.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Screening Results</h4>
          
          {checks.map((check) => {
            const IconComponent = getCheckIcon(check.type);
            
            return (
              <div key={check.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <IconComponent className="h-5 w-5 text-gray-600 mr-2" />
                    <span className="font-medium">{check.type.replace('_', ' ')} Check</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {check.status === 'PENDING' && (
                      <div className="flex items-center text-yellow-600">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="text-sm">Pending</span>
                      </div>
                    )}
                    {check.status === 'COMPLETED' && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm">Completed</span>
                      </div>
                    )}
                    {check.status === 'FAILED' && (
                      <div className="flex items-center text-red-600">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        <span className="text-sm">Failed</span>
                      </div>
                    )}
                  </div>
                </div>

                {check.status === 'COMPLETED' && check.details && (
                  <div className="space-y-3">
                    {check.score && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Credit Score:</span>
                        <span className={`text-lg font-bold ${getScoreColor(check.score)}`}>
                          {check.score}
                        </span>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        {Object.entries(check.details).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                            </span>
                            <span className="font-medium">{value as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {check.status === 'PENDING' && (
                  <div className="text-sm text-gray-600">
                    Check initiated {new Date(check.initiatedAt).toLocaleString()}. 
                    Results typically available within 24-48 hours.
                  </div>
                )}

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500">
                    Cost: ${check.cost}
                  </span>
                  {check.status === 'COMPLETED' && (
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Download Report
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Total Cost */}
      {checks.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-900">Total Screening Cost:</span>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-gray-600 mr-1" />
              <span className="text-lg font-bold text-gray-900">
                ${checks.reduce((total, check) => total + check.cost, 0)}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Costs are typically split between landlord and tenant as per local regulations
          </p>
        </div>
      )}

      {/* Legal Notice */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <h5 className="font-medium mb-1">Fair Housing Compliance</h5>
            <p>
              All background checks must comply with Fair Housing laws and NYC regulations. 
              Screening criteria must be applied consistently to all applicants. 
              Certain criminal history cannot be considered per NYC Fair Chance Act.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
