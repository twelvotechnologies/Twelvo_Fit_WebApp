import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env.js';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Gym ERP Backend API',
    version: '1.0.0',
    description: `
**Gym ERP** Enterprise REST API built with **TypeScript**, **Express (Port ${config.port})**, and **Prisma ORM**.

### Modules Included:
- **Health**: System status, uptime, memory, and runtime metadata.
- **Members**: Complete Member lifecycle management (Registration, Status tracking, Plans, CRUD).
    `,
    contact: {
      name: 'Gym ERP Support',
    },
  },
  servers: [
    {
      url: '/',
      description: 'Auto-detect Host (Works on Localhost & Ngrok)',
    },
    {
      url: `http://localhost:${config.port}`,
      description: 'Direct Express Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token from /api/v1/auth/login to authenticate protected endpoints',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'integer', example: 200 },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
          timestamp: { type: 'string', format: 'date-time', example: '2026-09-14T00:00:00.000Z' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'integer', example: 400 },
          message: { type: 'string', example: 'Error message description' },
          errors: { type: 'string', nullable: true },
          timestamp: { type: 'string', format: 'date-time', example: '2026-09-14T00:00:00.000Z' },
        },
      },
      LoginDTO: {
        type: 'object',
        required: ['usernameOrEmail', 'password'],
        properties: {
          usernameOrEmail: {
            type: 'string',
            example: 'paul_owner',
            description: 'Username or registered email address',
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'Twelvo@1234',
            description: 'User account password',
          },
        },
      },
      RefreshTokenDTO: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: 'string',
            description: 'Valid JWT refresh token issued at login',
          },
        },
      },
      AuthUser: {
        type: 'object',
        properties: {
          userId: { type: 'string', example: '1' },
          tenantId: { type: 'integer', example: 1 },
          tenantCode: { type: 'string', example: 'GYM0001' },
          tenantPrefix: { type: 'string', example: 'TW' },
          gymName: { type: 'string', example: 'Twelvo Gym & Fitness' },
          role: { type: 'string', enum: ['gym_owner', 'trainer', 'super_admin'], example: 'gym_owner' },
          username: { type: 'string', example: 'paul_owner' },
          email: { type: 'string', nullable: true, example: 'paul@twelvogym.com' },
          fullName: { type: 'string', nullable: true, example: 'Paul Saji' },
          city: { type: 'string', nullable: true, example: 'Bangalore' },
          status: { type: 'string', example: 'active' },
        },
      },
      AuthTokensResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', description: 'JWT access token for Authorization Bearer header' },
          refreshToken: { type: 'string', description: 'JWT refresh token' },
          expiresIn: { type: 'integer', example: 900, description: 'Access token expiration in seconds' },
          user: { $ref: '#/components/schemas/AuthUser' },
        },
      },
      HealthStatus: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'UP' },
          framework: { type: 'string', example: 'express' },
          uptimeSeconds: { type: 'integer', example: 120 },
          timestamp: { type: 'string', format: 'date-time' },
          nodeVersion: { type: 'string', example: 'v24.15.0' },
          memoryUsage: {
            type: 'object',
            properties: {
              rssMb: { type: 'integer', example: 60 },
              heapUsedMb: { type: 'integer', example: 15 },
            },
          },
        },
      },
      Member: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'c1234567-89ab-cdef-0123-456789abcdef' },
          fullName: { type: 'string', example: 'John Doe' },
          email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
          phone: { type: 'string', nullable: true, example: '+1 555-0101' },
          membershipPlan: { type: 'string', example: 'Gold Annual' },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'EXPIRED', 'SUSPENDED'],
            example: 'ACTIVE',
          },
          joinedAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateMemberDTO: {
        type: 'object',
        required: ['fullName', 'email'],
        properties: {
          fullName: { type: 'string', example: 'Alex Rivera' },
          email: { type: 'string', format: 'email', example: 'alex.rivera@example.com' },
          phone: { type: 'string', example: '+1 555-0199' },
          membershipPlan: { type: 'string', example: 'Platinum VIP' },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'EXPIRED', 'SUSPENDED'],
            default: 'ACTIVE',
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            description: 'Defaults to 30 days from now if omitted',
          },
        },
      },
      UpdateMemberDTO: {
        type: 'object',
        properties: {
          fullName: { type: 'string', example: 'Alex Rivera Updated' },
          email: { type: 'string', format: 'email', example: 'alex.new@example.com' },
          phone: { type: 'string', example: '+1 555-0199' },
          membershipPlan: { type: 'string', example: 'Diamond Annual' },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'EXPIRED', 'SUSPENDED'],
          },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
