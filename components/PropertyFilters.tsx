'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchService } from '@/services/api';
import { formatCurrency, getBoroughDisplayName } from '@/lib/utils';

interface FilterOptions {
  boroughs: Array<{ value: string; label: string; count: number }>;
  propertyTypes: Array<{ value: string; label: string; count: number }>;
  amenities: Array<{ value: string; label: string }>;
  priceRange: { min: number; max: number; avg: number };
}

interface PropertyFiltersProps {
  filters: any;
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
}

export function PropertyFilters({
  filters,
  onFilterChange,
  onClearFilters,
  onApplyFilters
}: PropertyFiltersProps) {
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const loadFilterOptions = async () => {
    try {
      const response = await searchService.getFilters();
      setFilterOptions(response.data);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleLocalFilterChange = (key: string, value: any) => {
    setLocalFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleArrayFilterChange = (key: string, value: string, checked: boolean) => {
    setLocalFilters((prev: any) => {
      const currentArray = prev[key] || [];
      if (checked) {
        return { ...prev, [key]: [...currentArray, value] };
      } else {
        return { ...prev, [key]: currentArray.filter((item: string) => item !== value) };
      }
    });
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
    onApplyFilters();
  };

  const resetFilters = () => {
    onClearFilters();
  };

  if (!filterOptions) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          Clear all
        </Button>
      </div>

      {/* Price Range */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-3 block">
          Price Range
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Min Price</label>
            <Input
              type="number"
              placeholder="$0"
              value={localFilters.minRent || ''}
              onChange={(e) => handleLocalFilterChange('minRent', parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Max Price</label>
            <Input
              type="number"
              placeholder="$10,000+"
              value={localFilters.maxRent || ''}
              onChange={(e) => handleLocalFilterChange('maxRent', parseInt(e.target.value) || 10000)}
            />
          </div>
        </div>
        {filterOptions.priceRange?.avg && (
          <div className="mt-2 text-xs text-gray-500">
            Average: {formatCurrency(filterOptions.priceRange.avg)}
          </div>
        )}
      </div>

      {/* Borough */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-3 block">
          Borough
        </label>
        <div className="space-y-2">
          {filterOptions.boroughs?.map((borough) => (
            <label key={borough.value} className="flex items-center">
              <input
                type="checkbox"
                checked={localFilters.borough?.includes(borough.value) || false}
                onChange={(e) => handleArrayFilterChange('borough', borough.value, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              />
              <span className="text-sm text-gray-700 flex-1">
                {getBoroughDisplayName(borough.value)}
              </span>
              <span className="text-xs text-gray-500">
                ({borough.count})
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Bedrooms */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-3 block">
          Bedrooms
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3, 4].map((num) => (
            <label key={num} className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={localFilters.bedrooms?.includes(num) || false}
                onChange={(e) => handleArrayFilterChange('bedrooms', num.toString(), e.target.checked)}
                className="sr-only"
              />
              <div className={`w-full h-10 border rounded-md flex items-center justify-center text-sm cursor-pointer transition-colors ${
                localFilters.bedrooms?.includes(num)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                {num === 0 ? 'Studio' : num === 4 ? '4+' : num}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Bathrooms */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-3 block">
          Min Bathrooms
        </label>
        <select
          value={localFilters.bathrooms || 0}
          onChange={(e) => handleLocalFilterChange('bathrooms', parseFloat(e.target.value))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value={0}>Any</option>
          <option value={1}>1+</option>
          <option value={1.5}>1.5+</option>
          <option value={2}>2+</option>
          <option value={2.5}>2.5+</option>
          <option value={3}>3+</option>
        </select>
      </div>

      {/* Property Type */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-3 block">
          Property Type
        </label>
        <div className="space-y-2">
          {filterOptions.propertyTypes?.map((type) => (
            <label key={type.value} className="flex items-center">
              <input
                type="checkbox"
                checked={localFilters.propertyType?.includes(type.value) || false}
                onChange={(e) => handleArrayFilterChange('propertyType', type.value, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              />
              <span className="text-sm text-gray-700 flex-1">
                {type.label}
              </span>
              <span className="text-xs text-gray-500">
                ({type.count})
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Special Features */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-3 block">
          Special Features
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localFilters.isRentStabilized === true}
              onChange={(e) => handleLocalFilterChange('isRentStabilized', e.target.checked ? true : undefined)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
            />
            <span className="text-sm text-gray-700">Rent Stabilized</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localFilters.isBrokerFee === false}
              onChange={(e) => handleLocalFilterChange('isBrokerFee', e.target.checked ? false : undefined)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
            />
            <span className="text-sm text-gray-700">No Broker Fee</span>
          </label>
        </div>
      </div>

      {/* Popular Amenities */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-3 block">
          Amenities
        </label>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {filterOptions.amenities?.slice(0, 10).map((amenity) => (
            <label key={amenity.value} className="flex items-center">
              <input
                type="checkbox"
                checked={localFilters.amenities?.includes(amenity.value) || false}
                onChange={(e) => handleArrayFilterChange('amenities', amenity.value, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              />
              <span className="text-sm text-gray-700">
                {amenity.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Apply Filters Button */}
      <div className="pt-4 border-t border-gray-200">
        <Button onClick={applyFilters} className="w-full">
          Apply Filters
        </Button>
      </div>
    </div>
  );
}