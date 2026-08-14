/**
 * Serviço de Clima e Temperatura ao Vivo com Detecção Automática de Localização (Open-Meteo API)
 * Totalmente gratuito, sem custos e otimizado com Cache em LocalStorage para máxima economia de dados.
 */

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  description: string;
  icon: string;
  cityName: string;
  isDay: boolean;
  cachedAt?: number;
  latitude?: number;
  longitude?: number;
}

const WEATHER_CACHE_KEY = 'traker_weather_data_cache';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos de cache

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

// Coordenadas padrão de fallback (Carapicuíba - SP)
const DEFAULT_FALLBACK = {
  lat: -23.5222,
  lon: -46.8356,
  cityName: 'Carapicuíba'
};

/**
 * Faz a busca reversa do nome da cidade a partir de latitude e longitude
 */
async function fetchCityName(lat: number, lon: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision;
      if (city) {
        return city;
      }
    }
  } catch (e) {
    // Fallback silencioso
  }
  return DEFAULT_FALLBACK.cityName;
}

/**
 * Tenta obter a localização atual do usuário pelo navegador (GPS/Rede) com timeout
 */
function getBrowserPosition(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      () => {
        resolve(null);
      },
      {
        timeout: 5000,
        maximumAge: 600000,
        enableHighAccuracy: false
      }
    );
  });
}

/**
 * Busca a previsão do tempo para coordenadas específicas com cache
 */
export async function getCurrentWeather(
  lat = DEFAULT_FALLBACK.lat,
  lon = DEFAULT_FALLBACK.lon,
  cityName = DEFAULT_FALLBACK.cityName
): Promise<WeatherData | null> {
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
        latitude: lat,
        longitude: lon,
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

/**
 * Função principal inteligente: detecta a localização real do usuário e busca o clima local
 */
export async function getUserLocalWeather(): Promise<WeatherData | null> {
  // 1. Tentar ler do Cache Local primeiro
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      const parsed: WeatherData = JSON.parse(cached);
      const isFresh = parsed.cachedAt && (Date.now() - parsed.cachedAt < CACHE_TTL_MS);
      if (isFresh && parsed.cityName) {
        return parsed;
      }
    }
  } catch (e) {}

  // 2. Tenta pegar a geolocalização do navegador
  const pos = await getBrowserPosition();
  let lat = DEFAULT_FALLBACK.lat;
  let lon = DEFAULT_FALLBACK.lon;
  let cityName = DEFAULT_FALLBACK.cityName;

  if (pos) {
    lat = pos.lat;
    lon = pos.lon;
    cityName = await fetchCityName(lat, lon);
  }

  return getCurrentWeather(lat, lon, cityName);
}

