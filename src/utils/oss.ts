import OSS from 'ali-oss';

const client = new OSS({
  accessKeyId: "xxx",
  accessKeySecret: "xxx",
  bucket: "xxx",
  region: "xxx"
});

export default client;