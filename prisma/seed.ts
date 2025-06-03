import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.resource.createMany({
    data: [
      { resourceName: 'Металл', resourCecost: 600 },
      { resourceName: 'Ткань', resourCecost: 400 },
      { resourceName: 'Механизм', resourCecost: 500 },
      { resourceName: 'Продукты', resourCecost: 300 },
      { resourceName: 'Пластик', resourCecost: 350 },
      { resourceName: 'Чипы', resourCecost: 800 },
    ],
    skipDuplicates: true,
  });

  await prisma.companyType.createMany({
    data: [
      { typeName: 'Лавка одежды', cost: 1500, baseIncome: 1 },
      { typeName: 'Пекарня', cost: 1800, baseIncome: 1 },
      { typeName: 'Автомастерская', cost: 2500, baseIncome: 1 },
      { typeName: 'Фабрика электроники', cost: 3500, baseIncome: 1 },
      { typeName: 'Ресторан', cost: 2200, baseIncome: 1 },
      { typeName: 'Магазин игрушек', cost: 1700, baseIncome: 1 },
      { typeName: 'Ферма', cost: 2000, baseIncome: 1 },
      { typeName: 'Салон красоты', cost: 1600, baseIncome: 1 },
      { typeName: 'IT-компания(стартап)', cost: 2800, baseIncome: 1 },
      { typeName: 'Завод по производству машин', cost: 4000, baseIncome: 1 },
      { typeName: 'Для акций 1', cost: 0, baseIncome: 1 },
      { typeName: 'Для акций 2', cost: 0, baseIncome: 1 },
      { typeName: 'Для акций 3', cost: 0, baseIncome: 1 },
    ],
    skipDuplicates: true,
  });

  await prisma.requirements.createMany({
    data: [
      { amount: 2, companyTypeId: 1, resourceId: 2 },
      { amount: 1, companyTypeId: 1, resourceId: 5 },
      { amount: 2, companyTypeId: 2, resourceId: 4 },
      { amount: 1, companyTypeId: 2, resourceId: 3 },
      { amount: 2, companyTypeId: 3, resourceId: 1 },
      { amount : 2, companyTypeId: 3, resourceId: 3 },
      { amount: 2, companyTypeId: 4, resourceId: 5 },
      { amount: 2, companyTypeId: 4, resourceId: 6 },
      { amount: 2, companyTypeId: 5, resourceId: 4 },
      { amount: 1, companyTypeId: 5, resourceId: 2 },
      { amount: 1, companyTypeId: 5, resourceId: 5 },
    ],
    skipDuplicates: true,
  });

  await prisma.company.createMany({
    data: [
        { companyName: ' Компания 1', companyTypeId: 11, incomeCoEfficient: 2, divident_rate: 2 },
        { companyName: ' Компания 2', companyTypeId: 12, incomeCoEfficient: 2, divident_rate: 2 },
        { companyName: ' Компания 3', companyTypeId: 13, incomeCoEfficient: 2, divident_rate: 2 },
    ],
    skipDuplicates: true,
  });

  await prisma.shares.createMany({
    data: [
        { costShares: 150, companyId: 1 },
        { costShares: 200, companyId: 2},
        { costShares: 100, companyId: 3},
    ],
    skipDuplicates: true,
  });

  await prisma.news.createMany({
    data: [
      {
        description: 'Государство выдало субсидии на развитие сельского хозяйства',
        effectCoEfficient: 0.2,
        companyTypeId: 1,
      },
      {
        description: 'Скандал с загрязнением окружающей среды ударил по репутации нефтяных компаний',
        effectCoEfficient: -0.2,
        companyTypeId: 2,
      },
      {
        description: 'Новый закон упростил экспорт продукции IT-компаний',
        effectCoEfficient: 0.3,
        companyTypeId: 3,
      },
      {
        description: 'Спрос на жилую недвижимость резко упал из-за повышения ставок',
        effectCoEfficient: -0.1,
        companyTypeId: 4,
      },
      {
        description: 'Резкий рост цен на металлы увеличил доходы горнодобывающих предприятий',
        effectCoEfficient: 0.25,
        companyTypeId: 5,
      },
      {
        description: 'Рост акций компании 1',
        effectCoEfficient: 0.3,
        companyTypeId: 11,
      },
      {
        description: 'Рост акций компании 2',
        effectCoEfficient: 0.4,
        companyTypeId: 12,
      },
      {
        description: 'Рост акций компании 3',
        effectCoEfficient: 0.2,
        companyTypeId: 13,
      },
      {
        description: 'Падение акций компании 3',
        effectCoEfficient: -0.4,
        companyTypeId: 13,
      },
      {
        description: 'Падение акций компании 2',
        effectCoEfficient: -0.2,
        companyTypeId: 12,
      },
      {
        description: 'Падение акций компании 1',
        effectCoEfficient: -0.1,
        companyTypeId: 11,
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(() => {
    console.log('Seed completed');
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
