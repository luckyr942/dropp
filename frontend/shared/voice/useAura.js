//pulic hook for any screen to acceess Aura

import { useAuraContext } from './AuraContext';

export default function useAura(){
    return useAuraContext()
}