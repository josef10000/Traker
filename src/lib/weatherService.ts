/**
 * Serviço de Clima e Temperatura ao Vivo (Open-Meteo API)
 * Totalmente gratuito, sem custos e otimizado com Cache em LocalStorage para máxima economia de dados.
 */

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  description: string;
  icon: string;
  cityName?: string;
  isDay: boolean;
  cachedAt?: number;
}

const WEATHER_CACHE_KEY = 'traker_weather_data_cache';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas de cache para economia absoluta de rede

const WEATHER_DESCRIPTIONS: Record<number, { text: string; icon: string }> = {
  0: { text: 'Céu Limpo', icon: '☀️' },
  1: { text: 'Predominantemente Limpo', icon: '🌤️' },
  2: { text: 'Parcialmente Nublado', icon: '⛅' },
  3: { text: 'Encoberto', icon: '☁️' },
  45: { text: 'Névoa', icon: '🌫️' },
  48: { text: 'Névoa com Geada', icon: '🌫️' },
  51: { text: 'Garoa Leve', icon: '🌦️' },
  53: { text: 'Garoa Moderada', icon: '🌦️' },
  55: { text: 'Garoa Densa', icon: '🌧️' },
  61: { text: 'Chuva Fraca', icon: '🌧️' },
  63: { text: 'Chuva Moderada', icon: '🌧️' },
  65: { text: 'Chuva Forte', icon: '🌧️' },
  80: { text: 'Pancadas de Chuva', icon: '🌦️' },
  81: { text: 'Pancadas Fortes', icon: '⛈️' },
  82: { text: 'Tempestade com Chuva', icon: '⛈️' },
  95: { text: 'Tempestade Elétrica', icon: '🌩️' },
};

/**
 * Busca a temperatura e o clima atual com verificação rigorosa de cache
 */
export async function getCurrentWeather(lat = -23.5505, lon = -46.6333, cityName = 'São Paulo'): Promise<WeatherData | null> {
  // 1. Tentar ler do Cache Local primeiro
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      const parsed: WeatherData = JSON.parse(cached);
      const isFresh = parsed.cachedAt && (Date.now() - parsed.cachedAt < CACHE_TTL_MS);
      if (isFresh) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler cache meteorológico:', e);
  }

  // 2. Se o cache expirou ou não existe, faz a consulta única
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=America%2FSao_Paulo`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    
    if (data && data.current_weather) {
      const code = data.current_weather.weathercode ?? 0;
      const weatherInfo = WEATHER_DESCRIPTIONS[code] || { text: 'Tempo Estável', icon: '🌡️' };
      
      const weatherResult: WeatherData = {
        temperature: Math.round(data.current_weather.temperature),
        weatherCode: code,
        description: weatherInfo.text,
        icon: weatherInfo.icon,
        cityName,
        isDay: Boolean(data.current_weather.is_day),
        cachedAt: Date.now()
      };

      try {
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weatherResult));
      } catch (e) {
        console.warn('Erro ao salvar cache meteorológico:', e);
      }

      return weatherResult;
    }
    return null;
  } catch (error) {
    console.warn('Alerta Clima: Não foi possível obter dados meteorológicos:', error);
    return null;
  }
}
