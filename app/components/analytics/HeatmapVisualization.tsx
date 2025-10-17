'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Activity, MousePointer, Eye, Loader2 } from 'lucide-react';

interface HeatmapVisualizationProps {
  pageId: string;
  pageName: string;
  dateRange?: number; // days
}

interface HeatmapData {
  heatmap_type: 'click' | 'move' | 'scroll' | 'attention';
  viewport_width: number;
  device_type: string;
  data_points: Array<{
    x: number;
    y: number;
    weight: number;
    count: number;
  }>;
  total_interactions: number;
  date: string;
}

export function HeatmapVisualization({
  pageId,
  pageName,
  dateRange = 7,
}: HeatmapVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'click' | 'move' | 'scroll' | 'attention'>('click');
  const [selectedDevice, setSelectedDevice] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');

  useEffect(() => {
    loadHeatmapData();
  }, [pageId, dateRange, selectedType, selectedDevice]);

  const loadHeatmapData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/landing-pages/${pageId}/heatmap?days=${dateRange}&type=${selectedType}&device=${selectedDevice}`
      );
      const data = await response.json();

      if (data.success) {
        setHeatmapData(data.data.heatmaps || []);
        renderHeatmap(data.data.heatmaps || []);
      }
    } catch (error) {
      console.error('Failed to load heatmap data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderHeatmap = (heatmaps: HeatmapData[]) => {
    const canvas = canvasRef.current;
    if (!canvas || heatmaps.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on viewport
    const viewportWidth = heatmaps[0]?.viewport_width || 1920;
    const viewportHeight = 1080; // Assume standard height for now
    canvas.width = viewportWidth;
    canvas.height = viewportHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Aggregate all data points across the date range
    const allPoints = heatmaps.flatMap(h => h.data_points);

    if (allPoints.length === 0) {
      // Draw "No data" message
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No heatmap data available', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Find max weight for color scaling
    const maxWeight = Math.max(...allPoints.map(p => p.count));

    // Draw heatmap points
    allPoints.forEach(point => {
      const intensity = point.count / maxWeight;
      const radius = 30; // Heatmap point radius

      // Create radial gradient
      const gradient = ctx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, radius
      );

      // Color gradient from blue (low) to red (high)
      const color = getHeatmapColor(intensity);
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.8})`);
      gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.4})`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

      // Draw the heatmap point
      ctx.fillStyle = gradient;
      ctx.fillRect(
        point.x - radius,
        point.y - radius,
        radius * 2,
        radius * 2
      );
    });

    // Apply blur for smoother visualization
    ctx.filter = 'blur(4px)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
  };

  const getHeatmapColor = (intensity: number): { r: number; g: number; b: number } => {
    // Blue (low) → Green (medium) → Yellow → Red (high)
    if (intensity < 0.25) {
      // Blue to Cyan
      return {
        r: 0,
        g: Math.floor(intensity * 4 * 255),
        b: 255,
      };
    } else if (intensity < 0.5) {
      // Cyan to Green
      return {
        r: 0,
        g: 255,
        b: Math.floor((0.5 - intensity) * 4 * 255),
      };
    } else if (intensity < 0.75) {
      // Green to Yellow
      return {
        r: Math.floor((intensity - 0.5) * 4 * 255),
        g: 255,
        b: 0,
      };
    } else {
      // Yellow to Red
      return {
        r: 255,
        g: Math.floor((1 - intensity) * 4 * 255),
        b: 0,
      };
    }
  };

  const getTotalInteractions = () => {
    return heatmapData.reduce((sum, h) => sum + h.total_interactions, 0);
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Heatmap Visualization
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {pageName} - Last {dateRange} days
            </p>
          </div>
          {!loading && (
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {getTotalInteractions().toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Total interactions</p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          {/* Heatmap Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heatmap Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedType('click')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                  selectedType === 'click'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <MousePointer className="w-4 h-4" />
                Clicks
              </button>
              <button
                onClick={() => setSelectedType('move')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                  selectedType === 'move'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Activity className="w-4 h-4" />
                Mouse Movement
              </button>
              <button
                onClick={() => setSelectedType('scroll')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                  selectedType === 'scroll'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Activity className="w-4 h-4" />
                Scroll
              </button>
              <button
                onClick={() => setSelectedType('attention')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                  selectedType === 'attention'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Eye className="w-4 h-4" />
                Attention
              </button>
            </div>
          </div>

          {/* Device Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Device Type
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
            </select>
          </div>
        </div>
      </div>

      {/* Heatmap Canvas */}
      <div className="p-6 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="ml-2 text-gray-600">Loading heatmap data...</span>
          </div>
        ) : (
          <div className="relative">
            {/* Color Legend */}
            <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-md z-10">
              <p className="text-xs font-medium text-gray-700 mb-2">Interaction Density</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Low</span>
                <div
                  className="w-20 h-4 rounded"
                  style={{
                    background: 'linear-gradient(to right, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF0000)',
                  }}
                />
                <span className="text-xs text-gray-500">High</span>
              </div>
            </div>

            {/* Canvas */}
            <canvas
              ref={canvasRef}
              className="w-full border border-gray-300 rounded-lg bg-white"
              style={{ maxHeight: '600px' }}
            />

            {heatmapData.length === 0 && !loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No heatmap data available yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Data will appear after users interact with your landing page
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-blue-50 border-t border-blue-100">
        <div className="flex items-start gap-2">
          <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">How to interpret heatmaps:</p>
            <ul className="mt-1 ml-4 list-disc space-y-1 text-blue-800">
              <li><strong>Clicks:</strong> Shows where users click most often</li>
              <li><strong>Mouse Movement:</strong> Shows where users hover their cursor</li>
              <li><strong>Scroll:</strong> Shows how far users scroll down the page</li>
              <li><strong>Attention:</strong> Shows where users spend the most time looking</li>
            </ul>
            <p className="mt-2">
              <strong>Hot spots (red areas)</strong> indicate high interaction,
              <strong> cold spots (blue areas)</strong> indicate low interaction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
