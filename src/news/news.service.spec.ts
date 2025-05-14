import { Test, TestingModule } from '@nestjs/testing';
import { NewsService } from './news.service';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';

const mockPrisma = {
  news: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  company: {
    updateMany: jest.fn(),
    findMany: jest.fn(),
  },
  shares: {
    updateMany: jest.fn(),
  },
  gameSession: {
    findMany: jest.fn(),
  },
};

describe('NewsService', () => {
  let service: NewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
    jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(() => 0 as unknown as NodeJS.Timeout);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getActiveNewsForSession', () => {
    it('должен вернуть активные новости для сессии', async () => {
      const fakeNews = [
        { id: 1, description: 'Test news', active: true },
        { id: 2, description: 'Another news', active: true },
      ];
      mockPrisma.news.findMany.mockResolvedValue(fakeNews);

      const result = await service.getActiveNewsForSession(42);

      expect(mockPrisma.news.findMany).toHaveBeenCalledWith({
        where: {
          gameSessionId: 42,
          active: true,
        },
      });
      expect(result).toEqual(fakeNews);
    });
  });
  it('должен вернуть пустой массив, если активных новостей нет', async () => {
    mockPrisma.news.findMany.mockResolvedValue([]);

    const result = await service.getActiveNewsForSession(999); // Сессия без новостей

    expect(result).toEqual([]);
    expect(mockPrisma.news.findMany).toHaveBeenCalledWith({
      where: { gameSessionId: 999, active: true },
    });
  });
  it('должен применить новость из файла к случайной сессии', async () => {
    mockPrisma.gameSession.findMany.mockResolvedValue([{ id: 1 }]);
    jest.spyOn(fs, 'readFileSync').mockReturnValue('Test news|1.1|2');
    mockPrisma.company.updateMany.mockResolvedValue({});
    mockPrisma.company.findMany.mockResolvedValue([{ id: 10 }]);
    mockPrisma.shares.updateMany.mockResolvedValue({});
    mockPrisma.news.create.mockResolvedValue({
      id: 5,
      description: 'Test news',
      effectCoEfficient: 1.1,
    });

    mockPrisma.news.update = jest.fn();

    const result = await service.applyRandomNewsFromFile();

    expect(result.message).toMatch(/Новость "Test news" применена/);
    expect(mockPrisma.company.updateMany).toHaveBeenCalled();
    expect(mockPrisma.news.create).toHaveBeenCalled();
  });
  it('должен вернуть сообщение, если нет активных сессий', async () => {
    mockPrisma.gameSession.findMany.mockResolvedValue([]);

    const result = await service.applyRandomNewsFromFile();

    expect(result.message).toBe(
      'Нет активных игровых сессий — новость не применена',
    );
  });
  it('должен выбросить исключение, если файл пуст', async () => {
    mockPrisma.gameSession.findMany.mockResolvedValue([{ id: 1 }]);
    jest.spyOn(fs, 'readFileSync').mockReturnValue('');

    await expect(service.applyRandomNewsFromFile()).rejects.toThrow(
      'Файл новостей пуст',
    );
  });
});
