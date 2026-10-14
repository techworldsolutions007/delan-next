'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { shopify } from '@/lib/shopify';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// --- GraphQL Mutations/Queries ---
const CUSTOMER_CREATE = `
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer { id firstName lastName email phone }
      customerUserErrors { code field message }
    }
  }
`;

const LOGIN = `
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken { accessToken expiresAt }
      customerUserErrors { code field message }
    }
  }
`;

const GET_CUSTOMER = `
  query getCustomer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id firstName lastName email phone
    }
  }
`;

const LOGOUT = `
  mutation customerAccessTokenDelete($customerAccessToken: String!) {
    customerAccessTokenDelete(customerAccessToken: $customerAccessToken) {
      deletedAccessToken userErrors { field message }
    }
  }
`;

export const AuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkCustomer = async () => {
      const storedToken = localStorage.getItem('customer_access_token');
      if (storedToken) {
        setToken(storedToken);
        try {
          // MODIFIED: 'data' is now the direct response from your shopify() function.
          const data = await shopify(GET_CUSTOMER, { customerAccessToken: storedToken });
          if (data && data.customer) {
            setCustomer(data.customer);
          } else {
            localStorage.removeItem('customer_access_token');
            setCustomer(null); setToken(null);
          }
        } catch (e) {
          console.error("AuthContext Error: Failed to fetch customer on load. Token might be expired.", e);
          localStorage.removeItem('customer_access_token');
          setCustomer(null); setToken(null);
        }
      }
      setAuthChecked(true);
    };
    checkCustomer();
  }, []);

  const signup = async (firstName, lastName, email, phone, password) => {
    // MODIFIED: 'data' is the direct response, no destructuring needed.
    const data = await shopify(CUSTOMER_CREATE, {
      input: { firstName, lastName, email, phone, password }
    });
    if (data.customerCreate.customerUserErrors.length > 0) {
      throw new Error(data.customerCreate.customerUserErrors[0].message);
    }
    return login(email, password);
  };

  const login = async (email, password) => {
    // MODIFIED: 'data' is the direct response.
    const data = await shopify(LOGIN, {
      input: { email, password }
    });
    if (data.customerAccessTokenCreate.customerUserErrors.length > 0) {
      throw new Error(data.customerAccessTokenCreate.customerUserErrors[0].message);
    }
    const newAccessToken = data.customerAccessTokenCreate.customerAccessToken.accessToken;
    localStorage.setItem('customer_access_token', newAccessToken);
    setToken(newAccessToken);

    // MODIFIED: 'customerData' is the direct response.
    const customerData = await shopify(GET_CUSTOMER, { customerAccessToken: newAccessToken });
    if (customerData && customerData.customer) {
        setCustomer(customerData.customer);
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await shopify(LOGOUT, { customerAccessToken: token });
      } catch (e) {
        // This is okay, the local token will be cleared regardless.
        console.error("Failed to delete Shopify access token (this can be ignored):", e);
      }
    }
    localStorage.removeItem('customer_access_token');
    setCustomer(null);
    setToken(null);
    window.location.href = '/';
  };

  const value = {
    customer,
    customerAccessToken: token,
    isLoggedIn: !!customer,
    authChecked,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};