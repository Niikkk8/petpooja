import { useState } from "react";
import { Banknote, Calculator, TrendingDown, TrendingUp, BarChart3, Percent } from "lucide-react";

// Custom Components
const Card = ({ className = "", children }) => {
  return (
    <div className={`rounded-lg border border-red-100 shadow-md overflow-hidden ${className}`}>
      {children}
    </div>
  );
};

const CardHeader = ({ className = "", children }) => {
  return (
    <div className={`p-4 bg-red-50 border-b border-red-100 ${className}`}>
      {children}
    </div>
  );
};

const CardTitle = ({ className = "", children }) => {
  return (
    <h3 className={`text-lg font-semibold text-red-800 ${className}`}>
      {children}
    </h3>
  );
};

const CardContent = ({ className = "", children }) => {
  return (
    <div className={`p-4 ${className}`}>
      {children}
    </div>
  );
};

const Input = ({ 
  id, 
  type = "text", 
  value, 
  onChange, 
  placeholder, 
  className = "", 
  disabled = false,
  min,
  max,
  step
}) => {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-red-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${className}`}
    />
  );
};

const Label = ({ htmlFor, className = "", children }) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}
    >
      {children}
    </label>
  );
};

const Button = ({ 
  type = "button",
  variant = "default", 
  size = "default", 
  disabled = false, 
  className = "", 
  children, 
  onClick 
}) => {
  let variantClasses = "";
  let sizeClasses = "";
  
  // Variants
  switch (variant) {
    case "outline":
      variantClasses = "border border-red-200 bg-white text-red-700 hover:bg-red-50";
      break;
    case "destructive":
      variantClasses = "bg-red-600 text-white hover:bg-red-700";
      break;
    case "ghost":
      variantClasses = "bg-transparent hover:bg-red-50 text-red-700";
      break;
    default: // default
      variantClasses = "bg-red-600 text-white hover:bg-red-700";
  }
  
  // Sizes
  switch (size) {
    case "sm":
      sizeClasses = "py-1 px-3 text-sm";
      break;
    case "lg":
      sizeClasses = "py-3 px-6 text-lg";
      break;
    case "icon":
      sizeClasses = "p-2";
      break;
    default: // default
      sizeClasses = "py-2 px-4";
  }
  
  return (
    <button
      type={type}
      className={`rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 ${variantClasses} ${sizeClasses} ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const CostCalculator = ({ profitTarget = 60 }) => {
  const [foodCost, setFoodCost] = useState(1000);
  const [wastePercentage, setWastePercentage] = useState(30);
  const [monthlyOrders, setMonthlyOrders] = useState(2000);
  const [averageOrderValue, setAverageOrderValue] = useState(15);
  
  // Calculate values
  const costOfWaste = (foodCost * wastePercentage / 100).toFixed(2);
  const annualWasteCost = (costOfWaste * 12).toFixed(2);
  const potentialSavings = (costOfWaste * 0.7).toFixed(2); // Assume 70% of waste can be saved
  const monthlyRevenue = (monthlyOrders * averageOrderValue).toFixed(2);
  const profitWithoutOptimization = (monthlyRevenue - foodCost).toFixed(2);
  const profitWithOptimization = (monthlyRevenue - (foodCost - Number(potentialSavings))).toFixed(2);
  const profitIncrease = (profitWithOptimization - profitWithoutOptimization).toFixed(2);
  const profitMarginWithoutOptimization = ((profitWithoutOptimization / monthlyRevenue) * 100).toFixed(1);
  const profitMarginWithOptimization = ((profitWithOptimization / monthlyRevenue) * 100).toFixed(1);
  const profitMarginIncrease = (profitMarginWithOptimization - profitMarginWithoutOptimization).toFixed(1);
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-red-800">Food Waste Cost Calculator</h2>
        <p className="text-gray-600 mt-1">Calculate the financial impact of food waste on your business</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" /> Input Values
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="food-cost">Monthly Food Cost ($)</Label>
                <Input
                  id="food-cost"
                  type="number"
                  min="0"
                  step="100"
                  value={foodCost}
                  onChange={(e) => setFoodCost(Number(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="waste-percentage">Estimated Waste Percentage (%)</Label>
                <Input
                  id="waste-percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={wastePercentage}
                  onChange={(e) => setWastePercentage(Number(e.target.value))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Industry average is between 20-40%
                </p>
              </div>
              
              <div>
                <Label htmlFor="monthly-orders">Monthly Orders</Label>
                <Input
                  id="monthly-orders"
                  type="number"
                  min="0"
                  step="10"
                  value={monthlyOrders}
                  onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="average-order">Average Order Value ($)</Label>
                <Input
                  id="average-order"
                  type="number"
                  min="0"
                  step="0.5"
                  value={averageOrderValue}
                  onChange={(e) => setAverageOrderValue(Number(e.target.value))}
                />
              </div>
              
              <div className="pt-4 text-center">
                <Button 
                  onClick={() => {
                    // This would trigger recalculation, but we're already reactive
                    alert("Calculations updated!");
                  }}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Monthly Waste Cost</p>
                  <p className="text-xl font-bold text-red-700">${costOfWaste}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Annual Waste Cost</p>
                  <p className="text-xl font-bold text-red-700">${annualWasteCost}</p>
                </div>
              </div>
              
              <div className="border-t border-b border-red-100 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-red-800 flex items-center">
                      <TrendingDown className="mr-1 h-4 w-4" /> Potential Monthly Savings
                    </h4>
                    <p className="text-gray-600 text-sm">With waste reduction</p>
                  </div>
                  <div className="text-xl font-bold text-green-600">${potentialSavings}</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-red-800 flex items-center">
                  <Percent className="mr-1 h-4 w-4" /> Profit Analysis
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Current Profit Margin</p>
                    <p className="text-lg font-bold text-red-700">{profitMarginWithoutOptimization}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Optimized Profit Margin</p>
                    <p className="text-lg font-bold text-green-600">{profitMarginWithOptimization}%</p>
                  </div>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Profit Margin Increase</p>
                    <p className="text-md font-bold text-green-700">+{profitMarginIncrease}%</p>
                  </div>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Additional Monthly Profit</p>
                    <p className="text-md font-bold text-green-700">+${profitIncrease}</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-2 text-center">
                <p className="text-sm text-gray-500">
                  Reaching your target profit of {profitTarget}% requires a waste reduction of 
                  <span className="font-bold text-red-700"> {Math.round(wastePercentage * 0.7)}%</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="bg-red-50 p-6 rounded-lg mt-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Recommendations</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center mt-0.5">1</span>
            <span>Implement portion control standards to reduce overproduction</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center mt-0.5">2</span>
            <span>Use the kitchen analysis tool to identify high waste areas</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center mt-0.5">3</span>
            <span>Improve inventory management with just-in-time ordering</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center mt-0.5">4</span>
            <span>Train staff on proper storage techniques to extend ingredient life</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CostCalculator;