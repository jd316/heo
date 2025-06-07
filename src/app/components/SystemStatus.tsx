'use client';

import { useEffect, useState } from 'react';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'offline';
  latency?: number;
  lastCheck: string;
  details?: string;
}

export default function SystemStatus() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkServices = async () => {
      try {
        // Mock service status - in real implementation, these would be actual health checks
        const mockServices: ServiceStatus[] = [
          {
            name: 'Gemini AI Service',
            status: process.env.NEXT_PUBLIC_GEMINI_API_KEY ? 'healthy' : 'offline',
            latency: 245,
            lastCheck: new Date().toISOString(),
            details: process.env.NEXT_PUBLIC_GEMINI_API_KEY ? 'gemini-2.5-pro-preview-05-06' : 'API key not configured'
          },
          {
            name: 'OriginTrail DKG',
            status: 'healthy',
            latency: 156,
            lastCheck: new Date().toISOString(),
            details: 'Connected to testnet node'
          },
          {
            name: 'OxiGraph Cache',
            status: 'healthy',
            latency: 89,
            lastCheck: new Date().toISOString(),
            details: '50TB corpus cached, SPARQL ready'
          },
          {
            name: 'IPFS Gateway',
            status: 'healthy',
            latency: 134,
            lastCheck: new Date().toISOString(),
            details: 'Decentralized storage operational'
          },
          {
            name: 'zkSNARK Circuit',
            status: 'healthy',
            latency: 3200,
            lastCheck: new Date().toISOString(),
            details: 'Groth16 proving system ready'
          },
          {
            name: 'Solana RPC',
            status: 'healthy',
            latency: 187,
            lastCheck: new Date().toISOString(),
            details: 'Devnet connection active'
          }
        ];

        setServices(mockServices);
      } catch (error) {
        console.error('Failed to check service status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkServices();
    // Refresh every 30 seconds
    const interval = setInterval(checkServices, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'offline':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'offline':
        return '❌';
      default:
        return '⚪';
    }
  };

  const overallStatus = services.length > 0 
    ? services.every(s => s.status === 'healthy') 
      ? 'All Systems Operational' 
      : services.some(s => s.status === 'offline')
        ? 'Some Services Offline'
        : 'Degraded Performance'
    : 'Checking Services...';

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">System Status</h2>
        <div className="flex items-center space-x-2">
          <div className={`h-3 w-3 rounded-full ${
            overallStatus === 'All Systems Operational' ? 'bg-green-500' :
            overallStatus === 'Some Services Offline' ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
          <span className="text-sm font-medium text-gray-700">{overallStatus}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 text-sm">{service.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                {getStatusIcon(service.status)} {service.status}
              </span>
            </div>
            
            <div className="space-y-1 text-xs text-gray-600">
              {service.latency && (
                <p>Latency: <span className="font-medium">{service.latency}ms</span></p>
              )}
              <p>Last Check: <span className="font-medium">
                {new Date(service.lastCheck).toLocaleTimeString()}
              </span></p>
              {service.details && (
                <p className="text-gray-500">{service.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Last updated: {new Date().toLocaleString()}</span>
          <span>Next refresh: 30s</span>
        </div>
      </div>
    </div>
  );
} 