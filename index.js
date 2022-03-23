const fetch = require('node-fetch');
const cityList = require('all-the-cities');
const Twitter = require('twitter-api-v2')

const {
  WEATHER_API_KEY,
  TWITTER_ACCESS_TOKEN,
  TWITTER_ACCESS_TOKEN_SECRET,
  TWITTER_APP_KEY,
  TWITTER_APP_SECRET
} = process.env;

// Tweeting cities that have over 50,000 citizens
const cities = [...new Set(cityList.filter(city => city.population > 50_000))]

const twitter = new Twitter.TwitterApiReadWrite({
  appKey: TWITTER_APP_KEY,
  appSecret: TWITTER_APP_SECRET,
  accessToken: TWITTER_ACCESS_TOKEN,
  accessSecret: TWITTER_ACCESS_TOKEN_SECRET
});

// Converting day unix timestamp to weekday name
function getWeekDay(unixTimestamp) {
  return new Date(unixTimestamp * 1000).toLocaleDateString('en-gb', { weekday: 'long' });
}

async function makeWeatherRequest(longitude, latitude) {
  const url = new URL('https://api.openweathermap.org/data/2.5/onecall');
  url.searchParams.set('lat', latitude);
  url.searchParams.set('lon', longitude);
  url.searchParams.set('appid', WEATHER_API_KEY);
  url.searchParams.set('units', 'metric');
  url.searchParams.set('exclude', 'minutely,hourly,current,alerts');

  const response = await fetch(url);
  return await response.json();
}

async function getWeather(longitude, latitude) {
  const weatherData = await makeWeatherRequest(longitude, latitude)
  let weatherForecastString = ''
  // Using only 7 days as twitter limits the text length.
  weatherData.daily.slice(0, 7).forEach(day => {
    weatherForecastString +=
      `
    ${getWeekDay(day.dt)}
    ${Math.round(day.temp.max)}°C/${Math.round(day.temp.min)}°C
    ${getWeatherEmoji(day.weather[0].main)}
    `
  });

  return weatherForecastString;
}

function getWeatherEmoji(weatherCode) {
  return {
    Rain: '🌧',
    Clear: '☀️',
    Clouds: '☁️',
    Snow: '❄️',
    Thunderstorm: '⛈',
    Drizzle: '🌦',
    Mist: '😶‍🌫️',
    Smoke: '💨',
    Haze: '🌆',
    Dust: '💨',
    Fog: '🌁',
    Sand: '💨',
    Ash: '💨',
    Squall: '🌀',
    Tornado: '🌪'
  }[weatherCode]
}

function getFlagEmoji(countryCode) {
  const codePoints =
    countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());

  return String.fromCodePoint(...codePoints);
}

function chooseRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function handler() {
  const randomCity = chooseRandomItem(cities);
  const weather = await getWeather(randomCity.loc.coordinates[0], randomCity.loc.coordinates[1]);
  const flag = getFlagEmoji(randomCity.country);

  const output = `
  ${randomCity.name}, ${flag}
  ${weather}
  `

  await twitter.v2.tweet(output);
}

module.exports = { handler };