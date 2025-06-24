'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  MessageSquare, 
  FileText, 
  CreditCard, 
  Home, 
  Shield, 
  CheckCircle, 
  Users, 
  Building, 
  DollarSign, 
  BarChart3, 
  Wrench, 
  ClipboardCheck,
  Star,
  ArrowRight,
  UserPlus,
  Upload,
  Calendar,
  Phone,
  MapPin,
  Zap,
  TrendingUp,
  Heart,
  Award,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function HowItWorksPage() {
  const [activeTab, setActiveTab] = useState('tenant');

  const tenantSteps = [
    {
      step: 1,
      icon: Search,
      title: "Search & Discover",
      description: "Browse thousands of verified listings across all five NYC boroughs. Use our advanced filters to find your perfect match.",
      features: [
        "No broker fees on any listing",
        "Map view with neighborhood insights", 
        "Advanced filtering by price, amenities, location",
        "Save favorites and get alerts"
      ]
    },
    {
      step: 2,
      icon: MessageSquare,
      title: "Connect Directly",
      description: "Message landlords directly through our secure platform. Schedule viewings and ask questions without middlemen.",
      features: [
        "Direct landlord communication",
        "Secure in-app messaging",
        "Quick response guarantees",
        "Property-specific conversations"
      ]
    },
    {
      step: 3,
      icon: FileText,
      title: "Apply Seamlessly",
      description: "Submit your application with our streamlined 5-step process. Upload documents securely and track your status in real-time.",
      features: [
        "FARE Act compliant applications",
        "Secure document upload",
        "Real-time status tracking",
        "Background check integration"
      ]
    },
    {
      step: 4,
      icon: Home,
      title: "Move In & Manage",
      description: "Once approved, access your tenant portal to manage payments, maintenance requests, and lease documents all in one place.",
      features: [
        "Online rent payments",
        "Maintenance request system",
        "Digital lease access",
        "Payment history tracking"
      ]
    }
  ];

  const landlordSteps = [
    {
      step: 1,
      icon: Upload,
      title: "List Your Property",
      description: "Create compelling listings with our easy-to-use property management tools. Showcase your apartments with professional photos and detailed descriptions.",
      features: [
        "Professional listing templates",
        "Multi-photo upload with optimization",
        "FARE Act compliant fee structures",
        "Neighborhood insights integration"
      ]
    },
    {
      step: 2,
      icon: Users,
      title: "Screen Applicants",
      description: "Review qualified applications with our comprehensive screening tools. Access credit reports, background checks, and employment verification.",
      features: [
        "Automated applicant screening",
        "Credit and background check integration",
        "Application scoring and ranking",
        "Digital document review"
      ]
    },
    {
      step: 3,
      icon: FileText,
      title: "Manage Leases",
      description: "Create, execute, and manage leases digitally. Track renewals, rent increases, and compliance with NYC rental laws.",
      features: [
        "Digital lease creation and signing",
        "Automated renewal reminders",
        "Rent stabilization compliance",
        "Lease template library"
      ]
    },
    {
      step: 4,
      icon: BarChart3,
      title: "Optimize & Grow",
      description: "Use our analytics dashboard to track performance, manage maintenance, and maximize your rental income across your portfolio.",
      features: [
        "Real-time performance analytics",
        "Maintenance management system",
        "Vendor network access",
        "Financial reporting and insights"
      ]
    }
  ];

  const tenantBenefits = [
    {
      icon: DollarSign,
      title: "Save Thousands",
      description: "No broker fees means you keep more money in your pocket. Save up to $5,000+ on your next apartment."
    },
    {
      icon: Shield,
      title: "FARE Act Protected",
      description: "Full legal protection under NYC's FARE Act. We ensure landlords can't pass broker fees to tenants."
    },
    {
      icon: Clock,
      title: "Faster Process",
      description: "Direct communication with landlords means faster responses and quicker application processing."
    },
    {
      icon: CheckCircle,
      title: "Verified Listings",
      description: "All properties and landlords are verified for authenticity and compliance with NYC rental laws."
    }
  ];

  const landlordBenefits = [
    {
      icon: TrendingUp,
      title: "Maximize Revenue",
      description: "Optimize rental income with our analytics dashboard and market insights. Reduce vacancy periods."
    },
    {
      icon: Zap,
      title: "Streamlined Operations",
      description: "Manage applications, leases, maintenance, and payments all in one integrated platform."
    },
    {
      icon: Users,
      title: "Quality Tenants",
      description: "Access pre-screened, qualified tenants with comprehensive background and credit checks."
    },
    {
      icon: Award,
      title: "Professional Tools",
      description: "Enterprise-grade property management tools typically reserved for large management companies."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                How It Works
              </h1>
              <p className="text-xl md:text-2xl mb-8 max-w-4xl mx-auto opacity-90">
                Whether you're finding your dream apartment or managing rental properties, 
                our platform makes the process simple, transparent, and profitable.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  variant="secondary"
                  onClick={() => setActiveTab('tenant')}
                  className={activeTab === 'tenant' ? 'bg-white text-blue-600' : ''}
                >
                  For Tenants
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-white border-white hover:bg-white hover:text-blue-600"
                  onClick={() => setActiveTab('landlord')}
                >
                  For Landlords
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-12">
                <TabsTrigger value="tenant" className="text-lg py-3">
                  <Home className="h-5 w-5 mr-2" />
                  For Tenants
                </TabsTrigger>
                <TabsTrigger value="landlord" className="text-lg py-3">
                  <Building className="h-5 w-5 mr-2" />
                  For Landlords
                </TabsTrigger>
              </TabsList>

              {/* Tenant Content */}
              <TabsContent value="tenant" className="space-y-20">
                {/* Tenant Hero */}
                <div className="text-center">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Find Your Perfect NYC Apartment
                  </h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    Skip the broker fees and connect directly with landlords. Our platform makes 
                    apartment hunting in NYC simple, transparent, and affordable.
                  </p>
                </div>

                {/* Tenant Steps */}
                <div className="space-y-16">
                  {tenantSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isEven = index % 2 === 0;
                    
                    return (
                      <div key={step.step} className={`flex flex-col lg:flex-row items-center gap-12 ${isEven ? '' : 'lg:flex-row-reverse'}`}>
                        <div className="flex-1">
                          <div className="flex items-center mb-6">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                              <span className="text-xl font-bold text-blue-600">{step.step}</span>
                            </div>
                            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-4">
                            {step.title}
                          </h3>
                          <p className="text-lg text-gray-600 mb-6">
                            {step.description}
                          </p>
                          <ul className="space-y-2">
                            {step.features.map((feature, featureIndex) => (
                              <li key={featureIndex} className="flex items-center text-gray-700">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex-1">
                          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-lg">
                            <div className="bg-white p-6 rounded-lg shadow-lg">
                              <Icon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                              <h4 className="text-lg font-semibold text-center text-gray-900">
                                Step {step.step}: {step.title}
                              </h4>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tenant Benefits */}
                <div className="bg-white p-12 rounded-lg shadow-lg">
                  <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
                    Why Tenants Love Our Platform
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {tenantBenefits.map((benefit, index) => {
                      const Icon = benefit.icon;
                      return (
                        <div key={index} className="text-center">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icon className="h-8 w-8 text-green-600" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">
                            {benefit.title}
                          </h4>
                          <p className="text-gray-600">
                            {benefit.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tenant CTA */}
                <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-12 rounded-lg text-center">
                  <h3 className="text-3xl font-bold mb-4">
                    Ready to Find Your Dream Apartment?
                  </h3>
                  <p className="text-xl mb-8 opacity-90">
                    Join thousands of NYC renters who have found their perfect home without paying broker fees.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" className="bg-white text-green-600 hover:bg-gray-100">
                      <Link href="/register?type=renter">
                        <UserPlus className="h-5 w-5 mr-2" />
                        Sign Up as Tenant
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-green-600">
                      <Link href="/properties">
                        <Search className="h-5 w-5 mr-2" />
                        Browse Properties
                      </Link>
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Landlord Content */}
              <TabsContent value="landlord" className="space-y-20">
                {/* Landlord Hero */}
                <div className="text-center">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Maximize Your Rental Property Success
                  </h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    Streamline your property management with our comprehensive platform. 
                    Find quality tenants, manage leases, and optimize your rental income.
                  </p>
                </div>

                {/* Landlord Steps */}
                <div className="space-y-16">
                  {landlordSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isEven = index % 2 === 0;
                    
                    return (
                      <div key={step.step} className={`flex flex-col lg:flex-row items-center gap-12 ${isEven ? '' : 'lg:flex-row-reverse'}`}>
                        <div className="flex-1">
                          <div className="flex items-center mb-6">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                              <span className="text-xl font-bold text-purple-600">{step.step}</span>
                            </div>
                            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-4">
                            {step.title}
                          </h3>
                          <p className="text-lg text-gray-600 mb-6">
                            {step.description}
                          </p>
                          <ul className="space-y-2">
                            {step.features.map((feature, featureIndex) => (
                              <li key={featureIndex} className="flex items-center text-gray-700">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex-1">
                          <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-lg">
                            <div className="bg-white p-6 rounded-lg shadow-lg">
                              <Icon className="h-16 w-16 text-purple-600 mx-auto mb-4" />
                              <h4 className="text-lg font-semibold text-center text-gray-900">
                                Step {step.step}: {step.title}
                              </h4>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Landlord Benefits */}
                <div className="bg-white p-12 rounded-lg shadow-lg">
                  <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
                    Why Landlords Choose Our Platform
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {landlordBenefits.map((benefit, index) => {
                      const Icon = benefit.icon;
                      return (
                        <div key={index} className="text-center">
                          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icon className="h-8 w-8 text-purple-600" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">
                            {benefit.title}
                          </h4>
                          <p className="text-gray-600">
                            {benefit.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Landlord CTA */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-12 rounded-lg text-center">
                  <h3 className="text-3xl font-bold mb-4">
                    Ready to Maximize Your Rental Income?
                  </h3>
                  <p className="text-xl mb-8 opacity-90">
                    Join successful landlords who are streamlining their operations and increasing their profits.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
                      <Link href="/register?type=landlord">
                        <Building className="h-5 w-5 mr-2" />
                        Sign Up as Landlord
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-purple-600">
                      <Link href="/register?type=property_manager">
                        <Users className="h-5 w-5 mr-2" />
                        Property Manager Signup
                      </Link>
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Platform Features Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Powerful Features for Everyone
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Our platform includes everything you need to succeed in the NYC rental market.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <MessageSquare className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Direct Communication</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Secure messaging between landlords and tenants with property-specific conversations and quick response guarantees.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CreditCard className="h-8 w-8 text-green-600 mb-2" />
                  <CardTitle>Payment Processing</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Secure online rent payments, security deposits, and application fees with automated processing and receipts.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Wrench className="h-8 w-8 text-orange-600 mb-2" />
                  <CardTitle>Maintenance Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Complete maintenance request system with photo uploads, vendor assignments, and progress tracking.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <BarChart3 className="h-8 w-8 text-purple-600 mb-2" />
                  <CardTitle>Analytics Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Real-time performance analytics, financial reporting, and market insights for data-driven decisions.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <ClipboardCheck className="h-8 w-8 text-red-600 mb-2" />
                  <CardTitle>Property Inspections</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Schedule and manage property inspections with photo documentation and detailed reporting.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-8 w-8 text-indigo-600 mb-2" />
                  <CardTitle>Legal Compliance</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    FARE Act compliance, rent stabilization tracking, and automated legal requirement monitoring.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Statistics Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Platform Success Metrics
              </h2>
              <p className="text-lg text-gray-600">
                See why our platform is the trusted choice for NYC rentals
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">10,000+</div>
                <div className="text-gray-600">Active Listings</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">$2.5M+</div>
                <div className="text-gray-600">Broker Fees Saved</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">25,000+</div>
                <div className="text-gray-600">Happy Renters</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600 mb-2">98%</div>
                <div className="text-gray-600">Satisfaction Rate</div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-700 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join the revolution in NYC rentals. Whether you're looking for an apartment or managing properties, 
              we have the tools you need to succeed.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                <Link href="/register?type=renter">
                  Find Your Apartment
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="/register?type=landlord">
                  List Your Property
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}