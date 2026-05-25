import { Schema, Query, Aggregate } from 'mongoose';

export function SoftDeletePlugin(schema: Schema) {
  schema.add({
    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  });

  const excludeDeleted = function (
    this: Query<unknown, unknown, unknown, unknown>,
    next: () => void,
  ) {
    const query = this.getQuery() as Record<string, unknown>;
    const options = this.getOptions();

    // Skip filter if skipSoftDelete is true or if query explicitly looks for 'deleted'
    if (
      options.skipSoftDelete === true ||
      (query && query.deleted !== undefined)
    ) {
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
  schema.pre(
    'aggregate',
    function (this: Aggregate<unknown[]>, next: () => void) {
      const options = this.options || {};
      if (options.skipSoftDelete === true) {
        return next();
      }

      const pipeline = this.pipeline();
      const hasDeletedMatch = pipeline.some(
        (stage) =>
          stage &&
          typeof stage === 'object' &&
          '$match' in stage &&
          (stage as Record<string, unknown>).$match &&
          typeof (stage as Record<string, unknown>).$match === 'object' &&
          'deleted' in ((stage as Record<string, unknown>).$match as Record<string, unknown>),
      );

      if (hasDeletedMatch) {
        return next();
      }

      pipeline.unshift({ $match: { deleted: { $ne: true } } });
      next();
    },
  );
}
