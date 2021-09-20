import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const cartRef = useRef<Product[]>();
  useEffect(() => {
    cartRef.current = cart;
  })

  const cartPreviousValue = cartRef.current ?? cart;
  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cartPreviousValue, cart])


  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const findProduct = updatedCart.find(product => product.id === productId);

      const stockProduct = await api.get<Stock>(`/stock/${productId}`).then(response => response.data);
      
      const currentAmount = findProduct ? findProduct.amount : 0;
      const newAmount = currentAmount + 1;
      
      if (newAmount > stockProduct.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (findProduct) {
        findProduct.amount = newAmount;
      } else {
        const product = await api.get(`/products/${productId}`).then(response => response.data);

        const newProduct = {
          ...product,
          amount: 1
        };

        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = cart.findIndex(product => product.id === productId);

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const updatedCart = [...cart];
      const stockProduct = await api.get<Stock>(`/stock/${productId}`).then(response => response.data);

      if (amount <= 0) return;

      if (amount > stockProduct.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const findProduct = updatedCart.find(product => product.id === productId);
      if (findProduct) {
        findProduct.amount = amount;
        setCart(updatedCart);
      } else {
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
