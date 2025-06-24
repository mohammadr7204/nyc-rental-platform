'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle, 
  Shield, 
  DollarSign, 
  FileText, 
  Phone, 
  ExternalLink, 
  Users, 
  TrendingDown, 
  Home, 
  AlertTriangle,
  Search,
  Star
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function FareActPage() {
  const [reportFormOpen, setReportFormOpen] = useState(false);

  const benefits = [
    {
      icon: DollarSign,
      title: "No More Forced Broker Fees",
      description: "Save thousands of dollars on broker fees that you didn't request or hire directly."
    },
    {
      icon: Shield,
      title: "Legal Protection",
      description: "Protected by law - landlords cannot pass broker fees to tenants for brokers they hire."
    },
    {
      icon: FileText,
      title: "Full Transparency",
      description: "All fees must be clearly disclosed upfront in listings and lease agreements."
    },
    {
      icon: Users,
      title: "Greater Choice",
      description: "You can still hire your own broker if you want representation in your apartment search."
    }
  ];

  const platformFeatures = [
    {
      icon: Search,
      title: "FARE Act Compliant Listings",
      description: "All our property listings clearly indicate who pays the broker fee, ensuring full compliance."
    },
    {
      icon: CheckCircle,
      title: "Verified Property Managers",
      description: "We verify that all landlords and property managers understand and follow FARE Act requirements."
    },
    {
      icon: AlertTriangle,
      title: "Easy Violation Reporting",
      description: "Built-in tools to report FARE Act violations directly to NYC authorities."
    },
    {
      icon: Star,
      title: "No Hidden Fees",
      description: "Connect directly with landlords and property managers without unexpected costs."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-6">
                Understanding NYC's FARE Act
              </h1>
              <p className="text-xl mb-8 max-w-3xl mx-auto">
                The Fairness in Apartment Rental Expenses Act protects tenants from unfair broker fees. 
                Learn how this groundbreaking law saves you money and how our platform ensures compliance.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  variant="secondary"
                  asChild
                >
                  <Link href="/properties">
                    Browse FARE-Compliant Properties
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-white border-white hover:bg-white hover:text-blue-600"
                  onClick={() => setReportFormOpen(true)}
                >
                  Report a Violation
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* What is FARE Act Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  What is the FARE Act?
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  The Fairness in Apartment Rental Expenses (FARE) Act is a New York City law that took effect on <strong>June 11, 2025</strong>. 
                  This landmark legislation fundamentally changes how broker fees work in NYC rentals.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                    <p className="text-gray-700">
                      <strong>Whoever hires the broker pays the broker</strong> - If a landlord hires a broker to list their apartment, the landlord pays the fee.
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                    <p className="text-gray-700">
                      <strong>No forced fees</strong> - Tenants cannot be required to pay broker fees for landlord-hired brokers.
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                    <p className="text-gray-700">
                      <strong>Full transparency</strong> - All fees must be clearly disclosed in listings and lease agreements.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-8 rounded-lg">
                <h3 className="text-2xl font-semibold text-blue-900 mb-4">
                  By the Numbers
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <div className="text-3xl font-bold text-blue-600">$13,000</div>
                    <div className="text-sm text-gray-600">Average upfront costs for NYC renters before FARE Act</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-600">15%+</div>
                    <div className="text-sm text-gray-600">Broker fees as percentage of annual rent (now eliminated for tenant)</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-600">50%+</div>
                    <div className="text-sm text-gray-600">NYC households that are rent-burdened</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                How the FARE Act Benefits You
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                The FARE Act represents the most significant change to NYC's rental market in decades, 
                putting money back in tenants' pockets and creating a more fair and transparent system.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <Card key={index} className="text-center">
                    <CardHeader>
                      <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                        <Icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg">{benefit.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center">
                        {benefit.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Platform Integration Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                How Our Platform Ensures FARE Act Compliance
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                We've built our platform from the ground up to ensure full compliance with the FARE Act, 
                giving you peace of mind and protecting your rights as a tenant.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {platformFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-8 rounded-lg">
              <div className="flex items-center space-x-4 mb-4">
                <Shield className="h-8 w-8 text-green-600" />
                <h3 className="text-2xl font-semibold text-gray-900">
                  Your Rights Are Protected
                </h3>
              </div>
              <p className="text-gray-700 mb-6">
                Every listing on our platform clearly indicates who pays broker fees. We work exclusively with 
                verified landlords and property managers who understand and comply with FARE Act requirements. 
                If you encounter any violations, our platform makes it easy to report them directly to NYC authorities.
              </p>
              <Button asChild>
                <Link href="/properties">
                  Start Your FARE-Protected Search
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Reporting Violations Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Spot a FARE Act Violation?
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  If you encounter any landlord or broker trying to charge you a fee for a broker they hired, 
                  you can report it. The law protects you with penalties of $500-$2,000 per violation.
                </p>
                <div className="space-y-4 mb-8">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-6 w-6 text-orange-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">Signs of FARE Act Violations:</p>
                      <ul className="text-gray-600 mt-2 space-y-1">
                        <li>• Listings that don't clearly state who pays broker fees</li>
                        <li>• Being asked to pay a broker fee for a landlord's broker</li>
                        <li>• Rental being conditioned on hiring a specific broker</li>
                        <li>• Vague or hidden fees that might be disguised broker costs</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <Button 
                    className="w-full sm:w-auto"
                    onClick={() => window.open('https://www.nyc.gov/site/dca/about/FAQ-Broker-Fees.page', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Report to NYC DCWP
                  </Button>
                  <p className="text-sm text-gray-500">
                    Or call 311 to file a complaint with the Department of Consumer and Worker Protection
                  </p>
                </div>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Phone className="h-5 w-5" />
                    <span>Need Help?</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Emergency Hotline</h4>
                    <p className="text-gray-600">Call 311 for immediate assistance with FARE Act violations</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Online Reporting</h4>
                    <p className="text-gray-600">Submit detailed complaints through the NYC DCWP website</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Legal Action</h4>
                    <p className="text-gray-600">The FARE Act allows you to sue for violations in civil court</p>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500">
                      <strong>Remember:</strong> You can report violations even if you haven't been directly affected. 
                      Help protect other tenants by reporting non-compliant listings.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-16 bg-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-6">
                Experience FARE Act Benefits Today
              </h2>
              <p className="text-xl mb-8">
                Join thousands of NYC renters who are saving money and finding great apartments without 
                forced broker fees. Our platform connects you directly with landlords and ensures 
                full FARE Act compliance.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  variant="secondary"
                  asChild
                >
                  <Link href="/register">
                    Start Your Search Today
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-white border-white hover:bg-white hover:text-blue-600"
                  asChild
                >
                  <Link href="/properties">
                    Browse Properties
                  </Link>
                </Button>
              </div>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold">100%</div>
                  <div className="text-blue-100">FARE Act Compliant</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">0</div>
                  <div className="text-blue-100">Hidden Fees</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">24/7</div>
                  <div className="text-blue-100">Support Available</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  When did the FARE Act take effect?
                </h3>
                <p className="text-gray-600">
                  The FARE Act took effect on June 11, 2025. Any lease agreements signed after this date are covered by the law.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Can I still hire my own broker?
                </h3>
                <p className="text-gray-600">
                  Yes! You can absolutely hire your own broker to represent you in your apartment search. 
                  In this case, you would pay the broker fee for the services you explicitly requested.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Will rents increase because of the FARE Act?
                </h3>
                <p className="text-gray-600">
                  Most experts believe rent increases will be minimal. About 50% of NYC housing is rent-stabilized, 
                  where landlords cannot increase rents significantly. Market competition should keep other rents competitive too.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  What if I already paid a broker fee after June 11, 2025?
                </h3>
                <p className="text-gray-600">
                  If you paid a prohibited broker fee after the FARE Act took effect, you can file a complaint with NYC DCWP 
                  to get your money back and have penalties imposed on the violator.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  How does your platform ensure FARE Act compliance?
                </h3>
                <p className="text-gray-600">
                  We verify all landlords and property managers, require clear fee disclosure on every listing, 
                  and provide easy reporting tools for any violations. Our platform is designed from the ground up 
                  to protect tenant rights under the FARE Act.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}