import type { DelayedCar } from '../Types/car'

export const initialDelayedCars: DelayedCar[] = [
  {
    id: '1',
    chassisNumber: 'VIN202600001',
    model: 'SUV B',
    stationNumber: 'ST-03',
    missingPart: 'ABS Sensor',
    criticality: 'critical',
    isDrItem: true,
    assignedEngineer: 'Ahmed Darwish',
    notes: 'Line stop risk. Supplier confirmation required.',
    status: 'waiting',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
  },
  {
    id: '2',
    chassisNumber: 'VIN202600002',
    model: 'Sedan A',
    stationNumber: 'ST-05',
    missingPart: 'Door Trim Clip',
    criticality: 'medium',
    isDrItem: false,
    assignedEngineer: 'Logistics Engineer 1',
    notes: 'Part expected in next milk run.',
    status: 'shipping',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString()
  },
  {
    id: '3',
    chassisNumber: 'VIN202600003',
    model: 'EV Model E',
    stationNumber: 'ST-07',
    missingPart: 'Battery Shield Bolt',
    criticality: 'critical',
    isDrItem: true,
    assignedEngineer: 'Quality Engineer 1',
    notes: 'Do not release without DR confirmation.',
    status: 'received_installed',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: new Date().toISOString()
  }
]
