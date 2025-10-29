// examples/use-in-http-handler.ts

import { UnifiedPreHandlerFn, UnifiedHandlerFn } from '@inh-lib/unified-route';
import { ProcessPipeline } from '../core/process-pipeline';
import { ProcessMiddlewareFn } from '../types/process-pipeline';
import { fail, complete } from '../utils/process-helpers';

// ========================================
// Business Logic Pipeline
// ========================================

interface CalculatePriceInput {
  productId: string;
  quantity: number;
  userId: string;
}

interface CalculatePriceOutput {
  originalPrice: number;
  discount: number;
  finalPrice: number;
  breakdown: Record<string, number>;
}

// Middlewares
const fetchProductMiddleware: ProcessMiddlewareFn<CalculatePriceInput, CalculatePriceOutput> = async (ctx) => {
  const { productId } = ctx.input;

  const product = await fetchProduct(productId);

  if (!product) {
    fail(ctx, `Product ${productId} not found`);
    return;
  }

  ctx.state['product'] = product;
};

const calculateBaseMiddleware: ProcessMiddlewareFn<CalculatePriceInput, CalculatePriceOutput> = (ctx) => {
  const product = ctx.state['product'] as { price: number };
  const { quantity } = ctx.input;

  const basePrice = product.price * quantity;
  ctx.state['basePrice'] = basePrice;
};

const applyDiscountMiddleware: ProcessMiddlewareFn<CalculatePriceInput, CalculatePriceOutput> = async (ctx) => {
  const { userId } = ctx.input;
  const basePrice = ctx.state['basePrice'] as number;

  const discount = await getUserDiscount(userId);
  const discountAmount = basePrice * (discount / 100);

  ctx.state['discount'] = discount;
  ctx.state['discountAmount'] = discountAmount;
};

const calculateFinalHandler: ProcessMiddlewareFn<CalculatePriceInput, CalculatePriceOutput> = (ctx) => {
  const basePrice = ctx.state['basePrice'] as number;
  const discountAmount = ctx.state['discountAmount'] as number;
  const discount = ctx.state['discount'] as number;

  complete(ctx, {
    originalPrice: basePrice,
    discount,
    finalPrice: basePrice - discountAmount,
    breakdown: {
      base: basePrice,
      discount: discountAmount
    }
  });
};

// Build pipeline
const pricingPipeline = new ProcessPipeline<CalculatePriceInput, CalculatePriceOutput>()
  .use(fetchProductMiddleware)
  .use(calculateBaseMiddleware)
  .use(applyDiscountMiddleware)
  .setHandler(calculateFinalHandler);

// ========================================
// ใช้ใน HTTP Handler
// ========================================

const calculatePriceHandler: UnifiedHandlerFn = async (ctx) => {
  const productId = ctx.request.params['productId'];
  const quantity = parseInt(ctx.request.body['quantity'] as string, 10);
  const userId = ctx.registry['userId'] as string;

  // ✅ เรียก process pipeline ใน handler
  const result = await pricingPipeline.execute({
    productId,
    quantity,
    userId
  });

  if (!result.success) {
    ctx.response.status(400).json({
      error: 'Pricing calculation failed',
      message: result.error?.message
    });
    return;
  }

  ctx.response.json({
    success: true,
    pricing: result.output
  });
};

// ========================================
// หรือใช้ใน PreHandler
// ========================================

const pricingPreHandler: UnifiedPreHandlerFn = async (ctx) => {
  const productId = ctx.request.params['productId'];
  const quantity = parseInt(ctx.request.body['quantity'] as string, 10);
  const userId = ctx.registry['userId'] as string;

  // ✅ เรียก process pipeline ใน preHandler
  const result = await pricingPipeline.execute({
    productId,
    quantity,
    userId
  });

  if (!result.success) {
    ctx.response.status(400).json({
      error: 'Invalid pricing',
      message: result.error?.message
    });
    return; // หยุด HTTP pipeline
  }

  // ✅ เก็บผลลัพธ์ใน registry สำหรับ handler ใช้
  ctx.registry['pricing'] = result.output;
};

// Handler ที่ใช้ข้อมูลจาก preHandler
const createOrderHandler: UnifiedHandlerFn = (ctx) => {
  const pricing = ctx.registry['pricing'] as CalculatePriceOutput;

  ctx.response.status(201).json({
    success: true,
    order: {
      ...pricing,
      orderId: `order-${Date.now()}`
    }
  });
};

// Mock functions
async function fetchProduct(id: string): Promise<{ price: number } | null> {
  await new Promise(resolve => setTimeout(resolve, 10));
  return { price: 100 };
}

async function getUserDiscount(userId: string): Promise<number> {
  await new Promise(resolve => setTimeout(resolve, 10));
  return userId === 'vip' ? 20 : 0;
}