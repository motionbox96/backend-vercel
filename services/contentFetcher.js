const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

class BackendContentFetcher {
  constructor() {
    this.articles = [];
    this.lastFetchDate = new Date(0);
    this.fetchInterval = 15 * 24 * 60 * 60 * 1000; // 15 days
    this.dataFile = path.join(__dirname, 'trending-articles.json');
    
    this.loadStoredArticles();
    this.startScheduledFetching();
  }

  async loadStoredArticles() {
    try {
      const data = await fs.readFile(this.dataFile, 'utf8');
      const stored = JSON.parse(data);
      this.articles = stored.articles || [];
      this.lastFetchDate = new Date(stored.lastFetchDate || 0);
      console.log(`Loaded ${this.articles.length} stored articles`);
    } catch (error) {
      console.log('No stored articles found, starting fresh');
      this.articles = [];
    }
  }

  async saveArticles() {
    try {
      const data = {
        articles: this.articles,
        lastFetchDate: new Date().toISOString(),
        version: '1.0'
      };
      await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
      console.log(`Saved ${this.articles.length} articles to storage`);
    } catch (error) {
      console.error('Error saving articles:', error);
    }
  }

  shouldFetchContent() {
    const now = new Date();
    const timeDiff = now.getTime() - this.lastFetchDate.getTime();
    return timeDiff >= this.fetchInterval;
  }

  async fetchTrendingContent() {
    if (!this.shouldFetchContent() && this.articles.length > 0) {
      console.log('Content is up to date, skipping fetch');
      return this.articles;
    }

    console.log('Fetching fresh trending content...');
    const newArticles = [];

    // Fetch from multiple sources
    const sources = [
      { name: 'DevTo', fetcher: this.fetchFromDevTo.bind(this) },
      { name: 'HackerNews', fetcher: this.fetchFromHackerNews.bind(this) },
      { name: 'GitHub', fetcher: this.fetchFromGitHub.bind(this) },
      { name: 'ProductHunt', fetcher: this.fetchFromProductHunt.bind(this) }
    ];

    for (const source of sources) {
      try {
        console.log(`Fetching from ${source.name}...`);
        const articles = await source.fetcher();
        newArticles.push(...articles);
        console.log(`Fetched ${articles.length} articles from ${source.name}`);
      } catch (error) {
        console.error(`Error fetching from ${source.name}:`, error.message);
      }
    }

    // Generate additional niche content
    const generatedArticles = await this.generateNicheContent();
    newArticles.push(...generatedArticles);

    // Process and save
    this.articles = this.processArticles(newArticles);
    this.lastFetchDate = new Date();
    await this.saveArticles();

    console.log(`Successfully fetched and processed ${this.articles.length} articles`);
    return this.articles;
  }

  async fetchFromDevTo() {
    try {
      const response = await fetch('https://dev.to/api/articles?tag=career&tag=design&tag=productivity&per_page=10&state=fresh');
      const articles = await response.json();
      
      return articles
        .filter(article => this.isRelevantContent(article.title + ' ' + article.description))
        .map(article => this.createArticleFromDevTo(article));
    } catch (error) {
      console.error('DevTo fetch error:', error);
      return [];
    }
  }

  async fetchFromHackerNews() {
    try {
      const topStoriesResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      const topStories = await topStoriesResponse.json();
      
      const articles = [];
      const storyPromises = topStories.slice(0, 20).map(async (storyId) => {
        try {
          const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`);
          const story = await storyResponse.json();
          
          if (story && this.isRelevantContent(story.title + ' ' + (story.text || ''))) {
            return this.createArticleFromHackerNews(story);
          }
          return null;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(storyPromises);
      return results.filter(Boolean);
    } catch (error) {
      console.error('HackerNews fetch error:', error);
      return [];
    }
  }

  async fetchFromGitHub() {
    try {
      const keywords = ['resume-template', 'cv-builder', 'portfolio-website', 'design-system'];
      const articles = [];

      for (const keyword of keywords) {
        const response = await fetch(
          `https://api.github.com/search/repositories?q=${keyword}&sort=updated&order=desc&per_page=5`,
          {
            headers: {
              'User-Agent': 'DesignForge360-ContentFetcher',
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        const data = await response.json();
        
        if (data.items) {
          const repoArticles = data.items.map(repo => this.createArticleFromGitHub(repo, keyword));
          articles.push(...repoArticles);
        }
      }

      return articles.slice(0, 5);
    } catch (error) {
      console.error('GitHub fetch error:', error);
      return [];
    }
  }

  async fetchFromProductHunt() {
    try {
      // Note: This is a simplified approach - ProductHunt requires proper authentication for their API
      // For now, we'll generate content based on typical ProductHunt trending topics
      const trendingTopics = [
        'AI Resume Builder Trends',
        'Remote Work Design Tools',
        'Professional Portfolio Platforms',
        'Career Development Apps',
        'Design Collaboration Software'
      ];

      return trendingTopics.map((topic, index) => this.createArticleFromTopic(topic, 'ProductHunt'));
    } catch (error) {
      console.error('ProductHunt fetch error:', error);
      return [];
    }
  }

  async generateNicheContent() {
    const topics = [
      'Latest Resume Design Trends for 2025',
      'AI-Powered Career Tools Changing Job Search',
      'Remote Work Portfolio Strategies',
      'Professional Branding in the Digital Age',
      'Freelance Design Market Analysis',
      'LinkedIn Optimization for Creative Professionals',
      'Modern CV Templates That Get Interviews',
      'Design Systems for Personal Branding',
      'Career Transition Strategies for Designers',
      'Professional Photography for Portfolios'
    ];

    return topics.map((topic, index) => this.createArticleFromTopic(topic, 'Generated'));
  }

  isRelevantContent(text) {
    const keywords = [
      'resume', 'cv', 'career', 'job', 'portfolio', 'design', 'branding',
      'freelance', 'remote work', 'productivity', 'professional', 'linkedin',
      'interview', 'hiring', 'ux', 'ui', 'graphic design', 'logo'
    ];
    
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword));
  }

  createArticleFromDevTo(article) {
    return {
      id: `devto-${article.id}`,
      title: article.title,
      slug: this.createSlug(article.title),
      excerpt: this.extractExcerpt(article.description || ''),
      content: this.enhanceContent(article.body_markdown || article.description, 'DevTo'),
      imageUrl: article.cover_image || this.generateFallbackImage(article.title),
      sourceUrl: article.url,
      category: this.categorizeContent(article.title),
      tags: article.tag_list || this.generateTags(article.title),
      publishDate: article.published_at,
      fetchDate: new Date().toISOString(),
      readTime: this.calculateReadTime(article.body_markdown || article.description),
      seoTitle: this.generateSEOTitle(article.title),
      metaDescription: this.generateMetaDescription(article.description || ''),
      trending: true,
      source: 'DevTo'
    };
  }

  createArticleFromHackerNews(story) {
    const content = this.expandHackerNewsContent(story);
    return {
      id: `hn-${story.id}`,
      title: story.title,
      slug: this.createSlug(story.title),
      excerpt: this.extractExcerpt(content),
      content,
      imageUrl: this.generateFallbackImage(story.title),
      sourceUrl: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
      category: this.categorizeContent(story.title),
      tags: this.generateTags(story.title),
      publishDate: new Date(story.time * 1000).toISOString(),
      fetchDate: new Date().toISOString(),
      readTime: this.calculateReadTime(content),
      seoTitle: this.generateSEOTitle(story.title),
      metaDescription: this.generateMetaDescription(content),
      trending: true,
      source: 'HackerNews'
    };
  }

  createArticleFromGitHub(repo, keyword) {
    const content = this.expandGitHubContent(repo, keyword);
    return {
      id: `github-${repo.id}`,
      title: `Open Source Project: ${repo.name}`,
      slug: this.createSlug(repo.name),
      excerpt: this.extractExcerpt(repo.description || ''),
      content,
      imageUrl: this.generateFallbackImage(repo.name),
      sourceUrl: repo.html_url,
      category: 'Technology',
      tags: [...(repo.topics || []), keyword],
      publishDate: repo.updated_at,
      fetchDate: new Date().toISOString(),
      readTime: this.calculateReadTime(content),
      seoTitle: this.generateSEOTitle(repo.name),
      metaDescription: this.generateMetaDescription(repo.description || ''),
      trending: true,
      source: 'GitHub'
    };
  }

  createArticleFromTopic(topic, source) {
    const content = this.generateContentForTopic(topic);
    const slug = this.createSlug(topic);
    
    return {
      id: `${source.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: topic,
      slug,
      excerpt: this.extractExcerpt(content),
      content,
      imageUrl: this.generateFallbackImage(topic),
      sourceUrl: '',
      category: this.categorizeContent(topic),
      tags: this.generateTags(topic),
      publishDate: new Date().toISOString(),
      fetchDate: new Date().toISOString(),
      readTime: this.calculateReadTime(content),
      seoTitle: this.generateSEOTitle(topic),
      metaDescription: this.generateMetaDescription(content),
      trending: true,
      source
    };
  }

  enhanceContent(originalContent, source) {
    const currentYear = new Date().getFullYear();
    return `
      <div class="content-header">
        <div class="trending-badge">🔥 Trending on ${source}</div>
        <div class="last-updated">Updated: ${new Date().toLocaleDateString()}</div>
      </div>

      ${originalContent}

      <div class="designforge-insights">
        <h3>DesignForge360 Expert Analysis</h3>
        <p>Our team has analyzed this trending content and here's how it applies to your professional development:</p>
        
        <div class="actionable-insights">
          <h4>Key Takeaways:</h4>
          <ul>
            <li>Stay current with industry trends and best practices</li>
            <li>Apply these insights to your personal branding strategy</li>
            <li>Update your portfolio and resume with trending elements</li>
            <li>Network with professionals discussing these topics</li>
          </ul>
        </div>

        <div class="next-steps">
          <h4>Action Items:</h4>
          <ol>
            <li>Assess how this trend affects your industry</li>
            <li>Update your professional materials accordingly</li>
            <li>Share insights with your network</li>
            <li>Monitor related developments</li>
          </ol>
        </div>
      </div>

      <div class="related-content">
        <p><strong>Need help implementing these trends?</strong> DesignForge360 offers professional templates and tools that incorporate the latest industry developments.</p>
      </div>
    `;
  }

  expandHackerNewsContent(story) {
    return `
      <h1>${story.title}</h1>
      
      <div class="story-meta">
        <p><strong>Trending Discussion</strong> | ${story.score || 0} points | ${story.descendants || 0} comments</p>
        <p>This topic is currently generating significant discussion in the tech community.</p>
      </div>
      
      ${story.text ? `<div class="original-content">${story.text}</div>` : ''}
      
      <h2>Professional Implications</h2>
      <p>This trending topic has important implications for career development and professional growth in today's market.</p>
      
      <h3>For Job Seekers</h3>
      <ul>
        <li>Stay informed about industry technological shifts</li>
        <li>Adapt your skill set to emerging trends</li>
        <li>Update your resume with relevant trending keywords</li>
        <li>Engage with industry discussions and thought leaders</li>
      </ul>
      
      <h3>For Design and Tech Professionals</h3>
      <ul>
        <li>Incorporate trending technologies into your work</li>
        <li>Update your portfolio with cutting-edge examples</li>
        <li>Participate in professional communities</li>
        <li>Share your expertise on trending topics</li>
      </ul>
      
      <h2>Industry Context</h2>
      <p>Understanding and engaging with trending topics in the tech community is crucial for professional development. This discussion reflects current market priorities and future directions.</p>
    `;
  }

  expandGitHubContent(repo, keyword) {
    return `
      <h1>Open Source Spotlight: ${repo.name}</h1>
      
      <div class="repo-stats">
        <p><strong>GitHub Project</strong> | ⭐ ${repo.stargazers_count} stars | 🍴 ${repo.forks_count} forks</p>
        <p><strong>Language:</strong> ${repo.language || 'Multiple'} | <strong>License:</strong> ${repo.license?.name || 'Not specified'}</p>
      </div>
      
      <div class="project-description">
        <h2>About This Project</h2>
        <p>${repo.description || 'This trending open source project offers valuable resources for professional development.'}</p>
      </div>
      
      <h2>Why This Matters for Your Career</h2>
      <p>Open source projects like this one represent current industry trends and best practices. Understanding and contributing to such projects can significantly boost your professional profile.</p>
      
      <h3>Learning Opportunities</h3>
      <ul>
        <li>Study modern development practices and patterns</li>
        <li>Learn from community contributions and discussions</li>
        <li>Understand industry-standard tooling and workflows</li>
        <li>Discover new technologies and frameworks</li>
      </ul>
      
      <h3>Professional Benefits</h3>
      <ul>
        <li>Showcase your involvement in trending projects</li>
        <li>Build your GitHub profile and contribution history</li>
        <li>Network with other professionals in the community</li>
        <li>Stay current with industry developments</li>
      </ul>
      
      <h2>How to Get Involved</h2>
      <p>Consider exploring this project, contributing improvements, or using it as inspiration for your own work. Engaging with trending open source projects is an excellent way to demonstrate your commitment to continuous learning and professional growth.</p>
      
      <div class="call-to-action">
        <h3>Take Action</h3>
        <ul>
          <li>Star the repository to show support</li>
          <li>Explore the codebase and documentation</li>
          <li>Consider contributing bug fixes or improvements</li>
          <li>Share the project with your professional network</li>
        </ul>
      </div>
    `;
  }

  generateContentForTopic(topic) {
    const sections = [
      'Current Industry Landscape',
      'Key Trends and Developments', 
      'Professional Applications',
      'Expert Insights and Recommendations',
      'Future Outlook',
      'Actionable Steps for Professionals'
    ];

    let content = `<h1>${topic}</h1>\n\n`;
    content += `<div class="trend-indicator">🔥 <strong>Trending Topic</strong> - Published ${new Date().toLocaleDateString()}</div>\n\n`;

    sections.forEach(section => {
      content += `<h2>${section}</h2>\n`;
      content += this.generateSectionContent(topic, section);
      content += '\n\n';
    });

    content += `
      <div class="designforge-cta">
        <h3>Ready to Implement These Trends?</h3>
        <p>DesignForge360 helps professionals stay ahead of industry trends with cutting-edge templates, tools, and resources. Our platform incorporates the latest best practices to ensure your career materials are always competitive and current.</p>
      </div>
    `;

    return content;
  }

  generateSectionContent(topic, section) {
    const templates = {
      'Current Industry Landscape': `<p>The professional landscape around ${topic.toLowerCase()} is rapidly evolving. Current market analysis reveals significant shifts in how organizations and individuals approach this area, with new technologies and methodologies reshaping traditional practices.</p>`,
      
      'Key Trends and Developments': `<p>Recent developments in ${topic.toLowerCase()} include:</p>
      <ul>
        <li>Integration of AI and automation technologies</li>
        <li>Emphasis on remote-first and hybrid approaches</li>
        <li>Focus on user experience and accessibility</li>
        <li>Data-driven decision making and analytics</li>
        <li>Sustainable and ethical practices</li>
      </ul>`,
      
      'Professional Applications': `<p>Professionals can apply ${topic.toLowerCase()} insights through:</p>
      <ol>
        <li>Strategic planning and goal setting</li>
        <li>Skill development and continuous learning</li>
        <li>Portfolio and resume enhancement</li>
        <li>Networking and community engagement</li>
        <li>Personal branding and online presence</li>
      </ol>`,
      
      'Expert Insights and Recommendations': `<p>Industry experts recommend the following approaches for ${topic.toLowerCase()}:</p>
      <ul>
        <li>Stay informed about emerging technologies and trends</li>
        <li>Invest in continuous professional development</li>
        <li>Build diverse, cross-functional skill sets</li>
        <li>Maintain active professional networks</li>
        <li>Focus on value creation and problem-solving</li>
      </ul>`,
      
      'Future Outlook': `<p>Looking ahead, ${topic.toLowerCase()} will likely be influenced by:</p>
      <ul>
        <li>Continued technological advancement and adoption</li>
        <li>Changing workplace dynamics and expectations</li>
        <li>Global market shifts and economic factors</li>
        <li>Environmental and social responsibility considerations</li>
        <li>Generational differences in work preferences</li>
      </ul>`,
      
      'Actionable Steps for Professionals': `<p>Take concrete action on ${topic.toLowerCase()} with these steps:</p>
      <ol>
        <li>Conduct a skills gap analysis and identify areas for improvement</li>
        <li>Create a professional development plan with specific goals</li>
        <li>Update your resume, portfolio, and online profiles</li>
        <li>Engage with industry communities and thought leaders</li>
        <li>Monitor trends and adapt your strategy accordingly</li>
      </ol>`
    };

    return templates[section] || `<p>Comprehensive analysis of ${section.toLowerCase()} as it relates to ${topic.toLowerCase()}.</p>`;
  }

  processArticles(articles) {
    // Remove duplicates, sort by relevance, and limit results
    const uniqueArticles = articles.filter((article, index, self) => 
      index === self.findIndex(a => a.title === article.title)
    );

    return uniqueArticles
      .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
      .slice(0, 20); // Keep top 20 articles
  }

  // Utility methods
  createSlug(title) {
    return title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  extractExcerpt(content, maxLength = 200) {
    const cleanContent = content.replace(/<[^>]*>/g, '').replace(/\n/g, ' ');
    return cleanContent.length > maxLength 
      ? cleanContent.substring(0, maxLength).trim() + '...'
      : cleanContent;
  }

  categorizeContent(title) {
    const categories = {
      'Career Advice': ['resume', 'cv', 'job', 'career', 'interview', 'linkedin', 'networking'],
      'Design': ['design', 'logo', 'branding', 'ui', 'ux', 'graphic', 'visual', 'portfolio'],
      'Remote Work': ['remote', 'freelance', 'productivity', 'work from home', 'digital nomad'],
      'Technology': ['ai', 'tech', 'software', 'app', 'development', 'programming', 'github']
    };

    const lowerTitle = title.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerTitle.includes(keyword))) {
        return category;
      }
    }
    
    return 'Professional Development';
  }

  generateTags(title) {
    const words = title.toLowerCase().split(/\W+/).filter(word => word.length > 2);
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'had', 'but', 'are'];
    const tags = words.filter(word => !commonWords.includes(word)).slice(0, 5);
    tags.push('trending', 'professional');
    return [...new Set(tags)];
  }

  calculateReadTime(content) {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  generateSEOTitle(title) {
    const year = new Date().getFullYear();
    return title.length < 50 ? `${title} - ${year} Guide | DesignForge360` : `${title} | DesignForge360`;
  }

  generateMetaDescription(content) {
    const excerpt = this.extractExcerpt(content, 150);
    return `${excerpt} Expert insights from DesignForge360.`;
  }

  generateFallbackImage(title) {
    // Use more reliable image services with better fallbacks
    const words = title.toLowerCase().split(/\W+/).filter(word => 
      word.length > 2 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all'].includes(word)
    ).slice(0, 3);
    
    const keywords = [...words, 'business', 'professional', 'career'].join(',');
    
    // Use Unsplash with better parameters
    return `https://images.unsplash.com/800x600/?${encodeURIComponent(keywords)}&auto=format&fit=crop&w=800&h=600&q=80`;
  }

  startScheduledFetching() {
    // Run every day at 6 AM to check if content needs updating
    cron.schedule('0 6 * * *', async () => {
      console.log('Checking for content updates...');
      try {
        await this.fetchTrendingContent();
        console.log('Scheduled content update completed');
      } catch (error) {
        console.error('Scheduled content update failed:', error);
      }
    });

    console.log('Scheduled content fetching started - runs daily at 6 AM');
  }

  getArticles() {
    return this.articles;
  }

  async forceRefresh() {
    this.lastFetchDate = new Date(0);
    return await this.fetchTrendingContent();
  }
}

// Export for use in server
module.exports = BackendContentFetcher;