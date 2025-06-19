'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, MapPin, SlidersHorizontal, Grid, List, Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyFilters } from '@/components/PropertyFilters';
import { SearchMap } from '@/components/GoogleMap';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { propertyService, searchService } from '@/services/api';
import { debounce } from '@/lib/utils';

interface FilterState {
  search: string;
  borough: string[];
  minRent: number;
  maxRent: number;
  bedrooms: number[];
  bathrooms: number;
  propertyType: string[];
  amenities: string[];
  isRentStabilized?: boolean;
  isBrokerFee?: boolean;
  sortBy: string;
  sortOrder: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    borough: [],
    minRent: 0,
    maxRent: 10000,
    bedrooms: [],
    bathrooms: 0,
    propertyType: [],
    amenities: [],
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Initialize filters from URL parameters
    const urlSearch = searchParams.get('search') || '';
    const urlBorough = searchParams.get('borough');
    const urlMinRent = searchParams.get('minRent');
    const urlMaxRent = searchParams.get('maxRent');
    const urlLat = searchParams.get('lat');
    const urlLng = searchParams.get('lng');
    const urlRadius = searchParams.get('radius');
    
    const newFilters = {
      ...filters,
      search: urlSearch,
      borough: urlBorough ? [urlBorough] : [],
      minRent: urlMinRent ? parseInt(urlMinRent) : 0,
      maxRent: urlMaxRent ? parseInt(urlMaxRent) : 10000,
      latitude: urlLat ? parseFloat(urlLat) : undefined,
      longitude: urlLng ? parseFloat(urlLng) : undefined,
      radius: urlRadius ? parseInt(urlRadius) : undefined,
    };
    
    setFilters(newFilters);
    
    if (urlLat && urlLng) {
      setSelectedLocation({
        lat: parseFloat(urlLat),
        lng: parseFloat(urlLng),
        address: urlSearch || 'Selected Location'
      });
    }
    
    loadProperties(1, newFilters);
  }, [searchParams]);

  const loadProperties = async (page = 1, customFilters = filters) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        ...customFilters,
        borough: customFilters.borough.length > 0 ? customFilters.borough : undefined,
        bedrooms: customFilters.bedrooms.length > 0 ? customFilters.bedrooms : undefined,
        propertyType: customFilters.propertyType.length > 0 ? customFilters.propertyType : undefined,
        amenities: customFilters.amenities.length > 0 ? customFilters.amenities : undefined
      };

      // Use search service for location-based search, property service for regular search
      const response = customFilters.latitude && customFilters.longitude 
        ? await searchService.searchProperties(params)
        : await propertyService.getProperties(params);
        
      setProperties(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading properties:', error);
      // Fallback for development when backend isn't available
      setProperties([]);
      setPagination({ page: 1, limit: 20, total: 0, pages: 0 });
    } finally {
      setLoading(false);
    }
  };

  const debouncedLoadProperties = useCallback(
    debounce(() => loadProperties(1), 500),
    [filters]
  );

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    
    // Update URL
    const params = new URLSearchParams();
    Object.entries(updatedFilters).forEach(([key, value]) => {
      if (value && value !== '' && value !== 0 && (!Array.isArray(value) || value.length > 0)) {
        params.set(key, Array.isArray(value) ? value.join(',') : String(value));
      }
    });
    router.push(`/properties?${params.toString()}`, { scroll: false });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const search = e.target.value;
    handleFilterChange({ search });
    debouncedLoadProperties();
  };

  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setSelectedLocation(location);
    handleFilterChange({
      latitude: location.lat,
      longitude: location.lng,
      radius: 1000, // 1km radius
      search: location.address
    });
    loadProperties(1, { 
      ...filters, 
      latitude: location.lat, 
      longitude: location.lng, 
      radius: 1000,
      search: location.address 
    });
  };

  const clearLocationFilter = () => {
    setSelectedLocation(null);
    const newFilters = { ...filters };
    delete newFilters.latitude;
    delete newFilters.longitude;
    delete newFilters.radius;
    setFilters(newFilters);
    loadProperties(1, newFilters);
  };

  const handlePageChange = (page: number) => {
    loadProperties(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSelectedLocation(null);
    setFilters({
      search: '',
      borough: [],
      minRent: 0,
      maxRent: 10000,
      bedrooms: [],
      bathrooms: 0,
      propertyType: [],
      amenities: [],
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    router.push('/properties');
  };

  // Transform properties for map display
  const mapProperties = properties.map((property: any) => ({
    id: property.id,
    title: property.title,
    address: property.address,
    latitude: property.latitude || 40.7831 + (Math.random() - 0.5) * 0.1, // Mock coordinates for demo
    longitude: property.longitude || -73.9712 + (Math.random() - 0.5) * 0.1,
    rentAmount: property.rentAmount,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            NYC Apartments for Rent
          </h1>
          <p className="text-lg text-gray-600">
            {pagination.total.toLocaleString()} properties available across all five boroughs
            {selectedLocation && (
              <span className="ml-2 text-blue-600">
                near {selectedLocation.address}
              </span>
            )}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search by neighborhood, address, or keywords..."
                  value={filters.search}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
              {selectedLocation && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Searching near: {selectedLocation.address}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearLocationFilter}
                    className="text-blue-600 h-6 px-2"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
            
            {/* Filter and View Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </Button>
              
              <div className="border border-gray-300 rounded-md flex">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'map' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('map')}
                  className="rounded-l-none"
                >
                  <MapIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <div className={`w-80 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <PropertyFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              onApplyFilters={() => loadProperties(1)}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Map View */}
            {viewMode === 'map' ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Map View</h3>
                    <div className="text-sm text-gray-600">
                      {properties.length} properties shown
                    </div>
                  </div>
                </div>
                <SearchMap
                  onLocationSelect={handleLocationSelect}
                  initialLocation={selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : undefined}
                  properties={mapProperties}
                />
              </div>
            ) : (
              <>
                {/* Sort Controls */}
                <div className="flex items-center justify-between mb-6">
                  <div className="text-sm text-gray-600">
                    Showing {((pagination.page - 1) * pagination.limit) + 1}-
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} properties
                  </div>
                  
                  <select
                    value={`${filters.sortBy}_${filters.sortOrder}`}
                    onChange={(e) => {
                      const [sortBy, sortOrder] = e.target.value.split('_');
                      handleFilterChange({ sortBy, sortOrder });
                      loadProperties(1);
                    }}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="createdAt_desc">Newest First</option>
                    <option value="createdAt_asc">Oldest First</option>
                    <option value="rentAmount_asc">Price: Low to High</option>
                    <option value="rentAmount_desc">Price: High to Low</option>
                    <option value="bedrooms_asc">Bedrooms: Low to High</option>
                    <option value="bedrooms_desc">Bedrooms: High to Low</option>
                    {selectedLocation && (
                      <option value="distance_asc">Distance: Near to Far</option>
                    )}
                  </select>
                </div>

                {/* Properties Grid/List */}
                {loading ? (
                  <div className={`grid gap-6 ${
                    viewMode === 'grid' 
                      ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
                      : 'grid-cols-1'
                  }`}>
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="h-48 bg-gray-200 shimmer"></div>
                        <div className="p-6">
                          <div className="h-6 bg-gray-200 shimmer rounded mb-3"></div>
                          <div className="h-4 bg-gray-200 shimmer rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-gray-200 shimmer rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : properties.length > 0 ? (
                  <>
                    <div className={`grid gap-6 ${
                      viewMode === 'grid' 
                        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
                        : 'grid-cols-1'
                    }`}>
                      {properties.map((property: any) => (
                        <PropertyCard
                          key={property.id}
                          property={property}
                          onSave={() => loadProperties(pagination.page)}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                      <div className="mt-12 flex items-center justify-center space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page <= 1}
                        >
                          Previous
                        </Button>
                        
                        {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                          const page = i + 1;
                          const isCurrentPage = page === pagination.page;
                          
                          return (
                            <Button
                              key={page}
                              variant={isCurrentPage ? 'default' : 'outline'}
                              onClick={() => handlePageChange(page)}
                              className="w-10"
                            >
                              {page}
                            </Button>
                          );
                        })}
                        
                        {pagination.pages > 5 && (
                          <span className="text-gray-500">...</span>
                        )}
                        
                        <Button
                          variant="outline"
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page >= pagination.pages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No properties found
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Try adjusting your filters or search criteria.
                    </p>
                    <Button onClick={clearFilters} variant="outline">
                      Clear all filters
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}