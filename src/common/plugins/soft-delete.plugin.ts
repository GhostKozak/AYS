import { Schema } from 'mongoose';

export function SoftDeletePlugin(schema: Schema) {
  schema.add({
    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  });

  const excludeDeleted = function (next: Function) {
    const query = this.getQuery();
    const options = this.getOptions();

    // Skip filter if skipSoftDelete is true or if query explicitly looks for 'deleted'
    if (options.skipSoftDelete === true || query.deleted !== undefined) {
      return next();
    }

    this.where({ deleted: { $ne: true } });
    next();
  };

  schema.pre('find', excludeDeleted);
  schema.pre('findOne', excludeDeleted);
  schema.pre('findOneAndUpdate', excludeDeleted);
  schema.pre(/^update/, excludeDeleted);
  schema.pre('countDocuments', excludeDeleted);
  schema.pre('aggregate', function (next) {
    const options = this.options || {};
    if (options.skipSoftDelete === true) {
      return next();
    }
    this.pipeline().unshift({ $match: { deleted: { $ne: true } } });
    next();
  });
}
