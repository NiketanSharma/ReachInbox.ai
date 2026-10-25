import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import { EmailJob } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface SearchOptions {
  userId?: string;
  query?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export class ElasticsearchService {
  private client: Client;
  private isConnected = false;
  private indexName: string;

  constructor() {
    this.indexName = config.elasticsearch.index;
    this.client = new Client({
      node: config.elasticsearch.node,
      maxRetries: 3,
      requestTimeout: 5000,
    });
  }

  /**
   * Initializes the Elasticsearch index with full-text search mappings.
   */
  public async initializeIndex(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                userId: { type: 'keyword' },
                senderEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                recipientEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                subject: { type: 'text' },
                body: { type: 'text' },
                status: { type: 'keyword' },
                scheduledAt: { type: 'date' },
                sentAt: { type: 'date' },
                etherealPreviewUrl: { type: 'keyword' },
                createdAt: { type: 'date' },
              },
            },
          },
        });
        console.log(`🔍 [Elasticsearch] Index "${this.indexName}" created with mappings.`);
      } else {
        console.log(`🔍 [Elasticsearch] Index "${this.indexName}" is ready.`);
      }
      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      console.warn('⚠️ [Elasticsearch] Could not connect to Elasticsearch cluster:', (error as Error).message);
      console.log('💡 Note: Search will gracefully fallback to PostgreSQL text search when Elasticsearch is offline.');
    }
  }

  /**
   * Indexes or updates an email record into Elasticsearch.
   */
  public async indexEmail(email: EmailJob): Promise<void> {
    try {
      await this.client.index({
        index: this.indexName,
        id: email.id,
        document: {
          id: email.id,
          userId: email.userId,
          senderEmail: email.senderEmail,
          recipientEmail: email.recipientEmail,
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduledAt: email.scheduledAt,
          sentAt: email.sentAt,
          etherealPreviewUrl: email.etherealPreviewUrl,
          createdAt: email.createdAt,
        },
        refresh: 'wait_for',
      });
      console.log(`🔍 [Elasticsearch] Indexed email document ${email.id} (${email.status})`);
    } catch (error) {
      console.warn(`⚠️ [Elasticsearch] Failed to index email ${email.id}:`, (error as Error).message);
    }
  }

  /**
   * Searches emails via Elasticsearch multi-match full-text query.
   * If Elasticsearch is offline, queries PostgreSQL with Prisma.
   */
  public async searchEmails(options: SearchOptions) {
    const { userId, query, status, limit = 50, offset = 0 } = options;

    if (this.isConnected && query && query.trim().length > 0) {
      try {
        const mustClauses: any[] = [];

        if (userId) {
          mustClauses.push({ term: { userId } });
        }

        if (status) {
          mustClauses.push({ term: { status } });
        }

        const trimmed = query.trim().toLowerCase();
        const wildcardPattern = `*${trimmed}*`;

        // Match-as-you-type: combines phrase prefix and wildcard queries so every alphabet matches instantly
        mustClauses.push({
          bool: {
            should: [
              {
                multi_match: {
                  query: trimmed,
                  type: 'phrase_prefix',
                  fields: ['subject^4', 'recipientEmail^4', 'senderEmail^2', 'body'],
                  slop: 3,
                },
              },
              {
                wildcard: {
                  'recipientEmail.keyword': {
                    value: wildcardPattern,
                    boost: 3,
                    case_insensitive: true,
                  },
                },
              },
              {
                wildcard: {
                  'senderEmail.keyword': {
                    value: wildcardPattern,
                    boost: 2,
                    case_insensitive: true,
                  },
                },
              },
              {
                query_string: {
                  query: `*${trimmed}*`,
                  fields: ['subject^3', 'recipientEmail^3', 'senderEmail', 'body'],
                  analyze_wildcard: true,
                },
              },
            ],
            minimum_should_match: 1,
          },
        });

        const result = await this.client.search({
          index: this.indexName,
          from: offset,
          size: limit,
          query: {
            bool: {
              must: mustClauses,
            },
          },
          sort: [{ createdAt: { order: 'desc' } }],
        });

        const hits = result.hits.hits.map((hit) => hit._source);
        const total = typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0;

        return {
          source: 'elasticsearch',
          total,
          emails: hits,
        };
      } catch (esError) {
        console.warn('⚠️ [Elasticsearch] Search query failed, falling back to DB:', (esError as Error).message);
      }
    }

    // Database Fallback Search
    const where: any = {};
    if (userId) where.userId = userId;
    if (status) {
      where.status = status;
    }

    if (query && query.trim().length > 0) {
      where.OR = [
        { subject: { contains: query } },
        { recipientEmail: { contains: query } },
        { senderEmail: { contains: query } },
        { body: { contains: query } },
      ];
    }

    const [emails, total] = await Promise.all([
      prisma.emailJob.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.emailJob.count({ where }),
    ]);

    return {
      source: 'database',
      total,
      emails,
    };
  }
}

export const elasticsearchService = new ElasticsearchService();
