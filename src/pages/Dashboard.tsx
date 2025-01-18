import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReactToPrint } from 'react-to-print';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Receipt from "@/components/Receipt";
import { toast } from "sonner";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentSale, setCurrentSale] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    
    checkUser();
    fetchProducts();
  }, [navigate]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
      toast.error("Failed to load products");
      return;
    }

    setProducts(data);
    const uniqueCategories = [...new Set(data.map(product => product.category))];
    setCategories(uniqueCategories.filter(Boolean));
  };

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(product => product.category === selectedCategory);

  const addToCart = (product: any) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const saleData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.price * item.quantity,
          name: item.name
        })),
        total_amount: calculateTotal(),
        payment_method: 'cash'
      };

      const { data: sale, error } = await supabase.functions.invoke('create-sale', {
        body: saleData
      });

      if (error) throw error;

      setCurrentSale({
        ...sale,
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.price * item.quantity
        }))
      });

      handlePrint();
      setCart([]);
      fetchProducts(); // Refresh products to update stock
      toast.success("Sale completed successfully!");
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || "Failed to process sale");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    onAfterPrint: () => {
      console.log('Print completed');
    }
  });

  return (
    <div className="flex h-screen">
      {/* Products Section */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="mb-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="p-4 border rounded hover:bg-gray-50 text-left"
              disabled={product.stock_quantity <= 0}
            >
              <h3 className="font-bold">{product.name}</h3>
              <p>${product.price.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Stock: {product.stock_quantity}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-gray-100 p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Cart</h2>
        <div className="flex-1 overflow-auto">
          {cart.map(item => (
            <div key={item.id} className="flex items-center justify-between mb-2 bg-white p-2 rounded">
              <div>
                <h3 className="font-medium">{item.name}</h3>
                <p>${item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="px-2 py-1 bg-gray-200 rounded"
                >
                  -
                </button>
                <span>{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="px-2 py-1 bg-gray-200 rounded"
                >
                  +
                </button>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="ml-2 text-red-500"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="text-xl font-bold mb-4">
            Total: ${calculateTotal().toFixed(2)}
          </div>
          <Button
            onClick={handleCheckout}
            className="w-full"
            disabled={cart.length === 0 || isProcessing}
          >
            {isProcessing ? "Processing..." : "Checkout"}
          </Button>
        </div>
      </div>

      {/* Hidden Receipt for Printing */}
      <div className="hidden">
        {currentSale && <Receipt ref={receiptRef} sale={currentSale} />}
      </div>
    </div>
  );
};

export default Dashboard;