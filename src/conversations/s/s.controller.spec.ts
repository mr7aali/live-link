import { Test, TestingModule } from '@nestjs/testing';
import { SController } from './s.controller';

describe('SController', () => {
  let controller: SController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SController],
    }).compile();

    controller = module.get<SController>(SController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
