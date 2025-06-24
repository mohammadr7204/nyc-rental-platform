'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, MapPin, Shield, DollarSign, Users, Star, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PropertyCard } from '@/components/PropertyCard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { propertyService } from '@/services/api';

export default function HomePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedProperties();
  }, []);

  const loadFeaturedProperties = async () => {
    try {
      const response = await propertyService.getProperties({
        limit: 6,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      setFeaturedProperties(response.data);
    } catch (error) {
      console.error('Error loading featured properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `/properties?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const features = [
    {
      icon: <DollarSign className="h-8 w-8 text-green-600" />,
      title: 'No Broker Fees',
      description: 'Connect directly with landlords and save thousands on broker fees. FARE Act compliant.'
    },
    {
      icon: <Shield className="h-8 w-8 text-blue-600" />,
      title: 'Verified Listings',
      description: 'All properties and landlords are verified for your safety and peace of mind.'
    },
    {
      icon: <Users className="h-8 w-8 text-purple-600" />,
      title: 'Direct Communication',
      description: 'Message landlords directly, schedule viewings, and get quick responses.'
    },
    {
      icon: <MapPin className="h-8 w-8 text-red-600" />,
      title: 'NYC Focused',
      description: 'Built specifically for NYC with neighborhood insights and local expertise.'
    }
  ];

  const stats = [
    { number: '10,000+', label: 'Active Listings' },
    { number: '25,000+', label: 'Happy Renters' },
    { number: '5,000+', label: 'Verified Landlords' },
    { number: '4.8/5', label: 'Average Rating' }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-purple-700 to-blue-800 text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-shadow">
              Find Your Perfect
              <span className="block text-yellow-300">NYC Apartment</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90">
              No broker fees. Direct connections. Thousands of verified listings across all five boroughs.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="flex flex-col sm:flex-row gap-4 p-2 bg-white rounded-lg shadow-lg">
                <div className="flex-1">
                  <Input
                    placeholder="Search by neighborhood, address, or ZIP code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="border-0 text-gray-800 text-lg h-12"
                  />
                </div>
                <Button 
                  onClick={handleSearch}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 h-12 px-8"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Search
                </Button>
              </div>
            </div>
            
            {!user && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                  <Link href="/register?type=renter">
                    Find Apartments
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                  <Link href="/register?type=landlord">
                    List Your Property
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Platform?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We've revolutionized NYC rentals by connecting landlords and tenants directly, 
              eliminating unnecessary fees and complications.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FARE Act Compliance Section */}
      <section className="py-16 bg-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              FARE Act Compliant
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
              Our platform fully complies with NYC's FARE Act, ensuring tenants aren't charged broker fees 
              for rental listings. Connect directly with property owners and save money.
            </p>
            <Button asChild variant="outline" className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white">
              <Link href="/fare-act">
                Learn More About FARE Act
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Featured Properties
            </h2>
            <p className="text-xl text-gray-600">
              Discover the latest listings from verified landlords across NYC
            </p>
          </div>
          
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="h-48 bg-gray-200 shimmer"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-200 shimmer rounded mb-3"></div>
                    <div className="h-4 bg-gray-200 shimmer rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 shimmer rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {featuredProperties.map((property: any) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
          
          <div className="text-center">
            <Button asChild size="lg">
              <Link href="/properties">
                View All Properties
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Find Your New Home?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of New Yorkers who have found their perfect apartment without paying broker fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              <Link href="/register">
                Get Started Today
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
              <Link href="/properties">
                Browse Properties
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}