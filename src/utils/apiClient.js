const axios = require('axios');

class ApiClient {
  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
  }

  /**
   * Random delay between 3-10 seconds
   */
  async randomDelay() {
    const delay = Math.floor(Math.random() * 7000) + 3000;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * GET request with rate limiting
   */
  async get(url, config = {}) {
    await this.randomDelay();
    try {
      const response = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      console.error(`API Error for ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * POST request with rate limiting
   */
  async post(url, data = {}, config = {}) {
    await this.randomDelay();
    try {
      const response = await this.client.post(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`API Error for ${url}:`, error.message);
      throw error;
    }
  }
}

module.exports = new ApiClient();
