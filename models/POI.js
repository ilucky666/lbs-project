const mongoose = require('mongoose');

const poiSchema = new mongoose.Schema({
  name: String,
  grade: String,
  province: String,
  geometry: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  }
});

poiSchema.index({ geometry: '2dsphere' }); // 空间索引，支持地理查询

module.exports = mongoose.model('POI', poiSchema);
