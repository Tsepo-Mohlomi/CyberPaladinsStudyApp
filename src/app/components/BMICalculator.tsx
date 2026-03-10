import { useState } from 'react';
import { Scale, Activity } from 'lucide-react';

export function BMICalculator() {
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [bmi, setBmi] = useState<number | null>(null);

  const calculateBMI = () => {
    let bmiValue: number;

    if (unit === 'metric') {
      const heightInMeters = parseFloat(height) / 100;
      const weightInKg = parseFloat(weight);
      
      if (heightInMeters && weightInKg) {
        bmiValue = weightInKg / (heightInMeters * heightInMeters);
        setBmi(Math.round(bmiValue * 10) / 10);
      }
    } else {
      const heightInInches = (parseFloat(feet) * 12) + parseFloat(inches || '0');
      const weightInLbs = parseFloat(weight);
      
      if (heightInInches && weightInLbs) {
        bmiValue = (weightInLbs / (heightInInches * heightInInches)) * 703;
        setBmi(Math.round(bmiValue * 10) / 10);
      }
    }
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600' };
    if (bmi >= 18.5 && bmi < 25) return { category: 'Normal weight', color: 'text-green-600' };
    if (bmi >= 25 && bmi < 30) return { category: 'Overweight', color: 'text-yellow-600' };
    return { category: 'Obese', color: 'text-red-600' };
  };

  const handleReset = () => {
    setHeight('');
    setWeight('');
    setFeet('');
    setInches('');
    setBmi(null);
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <div className="flex items-center justify-center gap-3 mb-6">
        <Scale className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">BMI Calculator</h1>
      </div>

      {/* Unit Toggle */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setUnit('metric')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            unit === 'metric'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Metric
        </button>
        <button
          onClick={() => setUnit('imperial')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            unit === 'imperial'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Imperial
        </button>
      </div>

      <div className="space-y-4 mb-6">
        {/* Height Input */}
        {unit === 'metric' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Height (cm)
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="170"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Height
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={feet}
                  onChange={(e) => setFeet(e.target.value)}
                  placeholder="Feet"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  value={inches}
                  onChange={(e) => setInches(e.target.value)}
                  placeholder="Inches"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Weight Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Weight ({unit === 'metric' ? 'kg' : 'lbs'})
          </label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={unit === 'metric' ? '70' : '154'}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Calculate Button */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={calculateBMI}
          className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Calculate
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
        >
          Reset
        </button>
      </div>

      {/* Result */}
      {bmi !== null && (
        <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <p className="text-sm font-medium text-gray-600">Your BMI</p>
          </div>
          <p className="text-4xl font-bold text-center text-gray-900 mb-3">
            {bmi}
          </p>
          <p className={`text-center text-lg font-semibold ${getBMICategory(bmi).color}`}>
            {getBMICategory(bmi).category}
          </p>
          
          {/* BMI Scale Reference */}
          <div className="mt-4 pt-4 border-t border-indigo-200">
            <p className="text-xs font-medium text-gray-600 mb-2">BMI Categories:</p>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Underweight</span>
                <span>&lt; 18.5</span>
              </div>
              <div className="flex justify-between">
                <span>Normal weight</span>
                <span>18.5 - 24.9</span>
              </div>
              <div className="flex justify-between">
                <span>Overweight</span>
                <span>25 - 29.9</span>
              </div>
              <div className="flex justify-between">
                <span>Obese</span>
                <span>≥ 30</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
