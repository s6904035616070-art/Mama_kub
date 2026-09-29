'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();

    // ฟังเหตุการณ์เมื่อมีออเดอร์ใหม่เข้ามาแบบ Realtime
    const channel = supabase
      .channel('realtime_orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          // ดึงข้อมูลออเดอร์ใหม่พร้อมรายการอาหาร
          fetchSingleOrder(payload.new.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, menus(name))')
      .neq('status', 'paid')
      .order('created_at', { ascending: true });

    setOrders(data || []);
  }

  async function fetchSingleOrder(orderId) {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, menus(name))')
      .eq('id', orderId)
      .single();

    if (data) {
      setOrders((prev) => [...prev, data]);
    }
  }

  const updateStatus = async (orderId, newStatus) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6">Kitchen Real-time Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {orders.map((order) => (
          <div key={order.id} className="border-2 border-slate-200 rounded-lg p-4 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <span className="text-xl font-bold text-slate-800">โต๊ะ {order.table_number}</span>
              <span className={`px-2 py-1 text-xs rounded font-bold uppercase ${
                order.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {order.status}
              </span>
            </div>

            <div className="space-y-1 mb-4">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.menus?.name}</span>
                  <span className="font-bold">x{item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              {order.status === 'pending' && (
                <button
                  onClick={() => updateStatus(order.id, 'cooking')}
                  className="w-full bg-blue-600 text-white py-1.5 rounded text-sm font-semibold hover:bg-blue-700"
                >
                  เริ่มทำ
                </button>
              )}
              {order.status === 'cooking' && (
                <button
                  onClick={() => updateStatus(order.id, 'served')}
                  className="w-full bg-emerald-600 text-white py-1.5 rounded text-sm font-semibold hover:bg-emerald-700"
                >
                  เสิร์ฟแล้ว
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
