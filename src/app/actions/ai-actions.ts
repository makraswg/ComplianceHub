
'use server';

import { AiConfig, DataSource } from '@/lib/types';
import { getCollectionData } from './mysql-actions';

/**
 * Testet die Verbindung zu einem Ollama Server.
 */
export async function testOllamaConnectionAction(url: string): Promise<{ success: boolean; message: string }> {
  if (!url) return { success: false, message: 'URL erforderlich.' };

  try {
    const response = await fetch(`${url}/api/tags`, {
      method: 'GET',
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      const models = data.models || [];
      return { 
        success: true, 
        message: `Verbindung erfolgreich. ${models.length} Modelle gefunden.` 
      };
    } else {
      return { 
        success: false, 
        message: `Ollama Server antwortete mit Status ${response.status}.` 
      };
    }
  } catch (e: any) {
    return { 
      success: false, 
      message: `Verbindungsfehler: ${e.message}. Stellen Sie sicher, dass Ollama lokal läuft und Anfragen von dieser IP erlaubt (OLLAMA_ORIGINS).` 
    };
  }
}

/**
 * Testet die Verbindung zu OpenRouter.
 */
export async function testOpenRouterConnectionAction(apiKey: string): Promise<{ success: boolean; message: string }> {
  if (!apiKey) return { success: false, message: 'API-Key erforderlich.' };

  try {
    const response = await fetch(`https://openrouter.ai/api/v1/auth/key`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      return { 
        success: true, 
        message: `Verbindung erfolgreich. Limit: ${data.data?.limit || 'Unbekannt'}` 
      };
    } else {
      return { 
        success: false, 
        message: `OpenRouter antwortete mit Status ${response.status}. Key evtl. ungültig.` 
      };
    }
  } catch (e: any) {
    return { 
      success: false, 
      message: `Verbindungsfehler: ${e.message}` 
    };
  }
}

/**
 * Ruft die aktive KI Konfiguration ab.
 */
export async function getActiveAiConfig(dataSource: DataSource = 'mysql'): Promise<AiConfig | null> {
  const result = await getCollectionData('aiConfigs', dataSource);
  if (result.data && result.data.length > 0) {
    return result.data.find(c => c.enabled === 1 || c.enabled === true) || result.data[0];
  }
  return null;
}
