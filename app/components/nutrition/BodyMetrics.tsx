'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Scale, Activity, TrendingUp, Calendar, AlertCircle, Plus } from 'lucide-react'
import Button from '@/app/components/ui/Button'
import { format, formatDistanceToNow } from 'date-fns'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface BodyMetricsProps {
  profile: any
  client: any
}

export default function BodyMetrics({ profile, client }: BodyMetricsProps) {
  const [metrics, setMetrics] = useState<any[]>([])
  const [latestMetric, setLatestMetric] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualData, setManualData] = useState({
    weight: '',
    body_fat_percentage: '',
    muscle_mass: '',
    bmr: ''
  })
  const supabase = createClient()

  useEffect(() => {
    if (profile) {
      fetchBodyMetrics()
    }
  }, [profile])

  const fetchBodyMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('nutrition_body_metrics')
        .select('*')
        .eq('profile_id', profile.id)
        .order('measurement_date', { ascending: false })

      if (error) throw error

      if (data) {
        setMetrics(data)
        setLatestMetric(data[0] || null)
      }
    } catch (error) {
      console.error('Error fetching body metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManualEntry = async () => {
    try {
      const { data, error } = await supabase
        .from('nutrition_body_metrics')
        .insert({
          organization_id: client.organization_id,
          profile_id: profile.id,
          measurement_date: new Date().toISOString().split('T')[0],
          measurement_time: new Date().toLocaleTimeString('en-US', { hour12: false }),
          device_type: 'MANUAL',
          weight: parseFloat(manualData.weight),
          body_fat_percentage: manualData.body_fat_percentage ? parseFloat(manualData.body_fat_percentage) : null,
          skeletal_muscle_mass: manualData.muscle_mass ? parseFloat(manualData.muscle_mass) : null,
          basal_metabolic_rate: manualData.bmr ? parseInt(manualData.bmr) : null,
          bmi: calculateBMI(parseFloat(manualData.weight), profile.height),
          lean_body_mass: manualData.muscle_mass && manualData.body_fat_percentage 
            ? parseFloat(manualData.weight) * (1 - parseFloat(manualData.body_fat_percentage) / 100)
            : null
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setMetrics([data, ...metrics])
        setLatestMetric(data)
        setShowManualEntry(false)
        setManualData({ weight: '', body_fat_percentage: '', muscle_mass: '', bmr: '' })
        
        // Update profile with new weight if changed
        if (parseFloat(manualData.weight) !== profile.current_weight) {
          await supabase
            .from('nutrition_profiles')
            .update({ current_weight: parseFloat(manualData.weight) })
            .eq('id', profile.id)
        }
      }
    } catch (error) {
      console.error('Error saving manual entry:', error)
    }
  }

  const calculateBMI = (weight: number, height: number) => {
    return Math.round((weight / ((height / 100) ** 2)) * 10) / 10
  }

  const formatChartData = () => {
    return metrics.slice(0, 10).reverse().map(metric => ({
      date: format(new Date(metric.measurement_date), 'MMM dd'),
      weight: metric.weight,
      bodyFat: metric.body_fat_percentage,
      muscleMass: metric.skeletal_muscle_mass
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Body Composition Metrics</h3>
          <p className="text-sm text-gray-600 mt-1">
            {latestMetric 
              ? `Last scan: ${formatDistanceToNow(new Date(latestMetric.measurement_date), { addSuffix: true })}`
              : 'No InBody scans recorded yet'
            }
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowManualEntry(!showManualEntry)}
        >
          <Plus className="h-4 w-4 mr-2" />
          {latestMetric ? 'Update Metrics' : 'Add Manual Entry'}
        </Button>
      </div>

      {/* Manual Entry Form */}
      {showManualEntry && (
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <h4 className="font-medium">Manual Entry</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={manualData.weight}
                onChange={(e) => setManualData({ ...manualData, weight: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="75.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body Fat %
              </label>
              <input
                type="number"
                step="0.1"
                value={manualData.body_fat_percentage}
                onChange={(e) => setManualData({ ...manualData, body_fat_percentage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="18.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Muscle Mass (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={manualData.muscle_mass}
                onChange={(e) => setManualData({ ...manualData, muscle_mass: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="35.2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BMR (kcal/day)
              </label>
              <input
                type="number"
                value={manualData.bmr}
                onChange={(e) => setManualData({ ...manualData, bmr: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1680"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowManualEntry(false)
                setManualData({ weight: '', body_fat_percentage: '', muscle_mass: '', bmr: '' })
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleManualEntry}
              disabled={!manualData.weight}
            >
              Save Entry
            </Button>
          </div>
        </div>
      )}

      {/* Current Metrics Display */}
      {latestMetric ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <Scale className="h-5 w-5 text-gray-400" />
                {latestMetric.device_type === 'INBODY' && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">InBody</span>
                )}
              </div>
              <p className="text-sm text-gray-600">Weight</p>
              <p className="text-2xl font-bold">{latestMetric.weight} kg</p>
              {metrics.length > 1 && (
                <p className="text-xs text-gray-500 mt-1">
                  {latestMetric.weight > metrics[1].weight ? '+' : ''}
                  {(latestMetric.weight - metrics[1].weight).toFixed(1)} kg
                </p>
              )}
            </div>

            {latestMetric.body_fat_percentage && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">Body Fat</p>
                <p className="text-2xl font-bold">{latestMetric.body_fat_percentage}%</p>
                {metrics.length > 1 && metrics[1].body_fat_percentage && (
                  <p className="text-xs text-gray-500 mt-1">
                    {latestMetric.body_fat_percentage > metrics[1].body_fat_percentage ? '+' : ''}
                    {(latestMetric.body_fat_percentage - metrics[1].body_fat_percentage).toFixed(1)}%
                  </p>
                )}
              </div>
            )}

            {latestMetric.skeletal_muscle_mass && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">Muscle Mass</p>
                <p className="text-2xl font-bold">{latestMetric.skeletal_muscle_mass} kg</p>
                {metrics.length > 1 && metrics[1].skeletal_muscle_mass && (
                  <p className="text-xs text-gray-500 mt-1">
                    {latestMetric.skeletal_muscle_mass > metrics[1].skeletal_muscle_mass ? '+' : ''}
                    {(latestMetric.skeletal_muscle_mass - metrics[1].skeletal_muscle_mass).toFixed(1)} kg
                  </p>
                )}
              </div>
            )}

            {latestMetric.basal_metabolic_rate && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">BMR</p>
                <p className="text-2xl font-bold">{latestMetric.basal_metabolic_rate}</p>
                <p className="text-xs text-gray-500 mt-1">kcal/day</p>
              </div>
            )}
          </div>

          {/* Progress Chart */}
          {metrics.length > 1 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="font-medium mb-4">Progress Over Time</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formatChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="weight"
                      stroke="#3B82F6"
                      name="Weight (kg)"
                      strokeWidth={2}
                    />
                    {formatChartData().some(d => d.bodyFat) && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="bodyFat"
                        stroke="#EF4444"
                        name="Body Fat %"
                        strokeWidth={2}
                      />
                    )}
                    {formatChartData().some(d => d.muscleMass) && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="muscleMass"
                        stroke="#10B981"
                        name="Muscle Mass (kg)"
                        strokeWidth={2}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Additional InBody Metrics */}
          {latestMetric.device_type === 'INBODY' && (
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900">InBody Scan Data</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Your nutrition targets are personalized based on your latest InBody scan from{' '}
                    {format(new Date(latestMetric.measurement_date), 'MMMM d, yyyy')}.
                  </p>
                  {latestMetric.visceral_fat_level && (
                    <p className="text-sm text-blue-700 mt-2">
                      Visceral Fat Level: {latestMetric.visceral_fat_level}/20
                      {latestMetric.visceral_fat_level > 10 && ' (Consider reducing for optimal health)'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="font-medium text-gray-900 mb-2">No Body Metrics Recorded</h4>
          <p className="text-sm text-gray-600 mb-4">
            Add your body measurements to track progress and personalize your nutrition plan.
          </p>
          <Button onClick={() => setShowManualEntry(true)}>
            Add First Entry
          </Button>
        </div>
      )}
    </div>
  )
}