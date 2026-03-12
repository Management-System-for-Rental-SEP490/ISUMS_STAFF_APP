import { create } from 'zustand';
import { AlertState } from '../shared/types';

export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  title: '',
  message: '',
  buttons: [],
  type: 'info',
  show: (title, message, buttons = [{ text: 'OK' }], type = 'info') =>
    set({ visible: true, title, message, buttons, type }),
  hide: () => set({ visible: false }),
}));
