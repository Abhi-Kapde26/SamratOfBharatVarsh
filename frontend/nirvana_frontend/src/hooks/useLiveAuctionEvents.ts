import { useEffect, useRef } from 'react';

interface EventCallbacks {
  onStateChange?: (state: any) => void;
  onTimerTick?: (data: { remaining: number }) => void;
  onTimerComplete?: (data: any) => void;
  onTeamsUpdated?: (data: any) => void;
  onPurchaseConfirmed?: (data: any) => void;
  onTransactionCorrected?: (data: any) => void;
  onKingdomsUpdated?: (data: any) => void;
  onAuctionReset?: (data: any) => void;
}

export function useLiveAuctionEvents(callbacks: EventCallbacks) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    function connect() {
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('state_change', (e) => {
        try {
          const data = JSON.parse(e.data);
          callbacksRef.current.onStateChange?.(data);
        } catch (err) {
          console.error('Error parsing state_change event:', err);
        }
      });

      eventSource.addEventListener('timer_tick', (e) => {
        try {
          const data = JSON.parse(e.data);
          callbacksRef.current.onTimerTick?.(data);
        } catch (err) {
          console.error('Error parsing timer_tick event:', err);
        }
      });

      eventSource.addEventListener('timer_complete', (e) => {
        try {
          const data = JSON.parse(e.data);
          callbacksRef.current.onTimerComplete?.(data);
        } catch (err) {
          console.error('Error parsing timer_complete event:', err);
        }
      });

      eventSource.addEventListener('teams_updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          callbacksRef.current.onTeamsUpdated?.(data);
        } catch (err) {
          console.error('Error parsing teams_updated event:', err);
        }
      });

      eventSource.addEventListener('purchase_confirmed', (e) => {
        try {
          const data = JSON.parse(e.data);
          callbacksRef.current.onPurchaseConfirmed?.(data);
        } catch (err) {
          console.error('Error parsing purchase_confirmed event:', err);
        }
      });

      eventSource.addEventListener('transaction_corrected', (e) => {
        try {
          const data = JSON.parse(e.data);
          callbacksRef.current.onTransactionCorrected?.(data);
        } catch (err) {
          console.error('Error parsing transaction_corrected event:', err);
        }
      });

      eventSource.addEventListener('kingdoms_updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          callbacksRef.current.onKingdomsUpdated?.(data);
        } catch (err) {
          console.error('Error parsing kingdoms_updated event:', err);
        }
      });

      eventSource.addEventListener('auction_reset', (e) => {
        try {
          const data = JSON.parse(e.data);
          callbacksRef.current.onAuctionReset?.(data);
        } catch (err) {
          console.error('Error parsing auction_reset event:', err);
        }
      });

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
        }
        // Attempt reconnect after 3 seconds
        reconnectTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);
}
