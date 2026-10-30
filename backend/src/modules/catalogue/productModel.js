import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
    {
        merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
        name: { type: String, required: true, trim: true, maxlength: 120 },
        nameAliases: { type: [String], default: [] }, // "seb", "kela", Hindi/regional keywords for Aura voice matching
        category: { type: String, required: true, trim: true, default: 'General' },
        price: { type: Number, required: true, min: 0 },
        discountPrice: { type: Number, default: null, min: 0 },
        unit: { type: String, default: '1 pc', trim: true },
        stockQuantity: { type: Number, required: true, default: 0, min: 0 },
        availability: { type: String, enum: ['in_stock', 'out_of_stock', 'discontinued'], default: 'in_stock' },
        description: { type: String, default: '', maxlength: 1000 },
        image: { type: String, default: '' },
        isVeg: { type: Boolean, default: true },
    },
    { timestamps: true }
);

productSchema.pre('validate', function (next) {
    if (this.discountPrice != null && this.discountPrice > this.price) {
        this.invalidate('discountPrice', 'Discount price cannot exceed price');
    }
    next();
});

productSchema.index({ merchantId: 1, availability: 1 });
productSchema.index({ merchantId: 1, category: 1 });
productSchema.index({ name: 'text', nameAliases: 'text' }, { default_language: 'none' });

export const Product = mongoose.model('Product', productSchema);