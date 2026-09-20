import axios from 'axios';
import { config } from '../config/index.js';

export async function getWeather(city: string): Promise<string> {
  if (!config.openweatherApiKey) {
    return `Weather API key is not set. Searching general weather for ${city}...`;
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${config.openweatherApiKey}`;
    const response = await axios.get(url);
    const data = response.data;

    const weather = data.weather[0]?.description || 'Clear';
    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const humidity = data.main.humidity;

    return `Current weather in ${data.name}, ${data.sys.country}: ${temp}°C (${weather}), feels like ${feelsLike}°C. Humidity: ${humidity}%.`;
  } catch (error: any) {
    return `Could not retrieve weather for ${city}: ${error.message}`;
  }
}
