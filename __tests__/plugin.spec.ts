import { FeDevServer } from 'fe-dev-server-core';
import getPort from 'get-port';
import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import axios from 'axios';
import { MockPlugin } from '../src/plugin';

const createMockFile = async ({ mockFilepath, mockDir, fileContent }: { mockFilepath: string; mockDir: string; fileContent: string }) => {
  const filepath = path.resolve(mockDir, mockFilepath);
  await fs.ensureFile(filepath);
  await fs.writeFile(filepath, fileContent);
};

describe('mock plugin basic logic', () => {
  let server: FeDevServer;
  let port: number;
  let mockDir: string;

  beforeEach(async () => {
    temp.track();
    port = await getPort();
    mockDir = temp.mkdirSync('mock');
    server = new FeDevServer({
      port,
      plugins: [new MockPlugin({ cfg: { mockDir } })],
    });
  });

  afterEach(async () => {
    await server.close();
    temp.cleanupSync();
  });

  it('mock should be ignored when enable is false', async () => {
    await createMockFile({
      mockFilepath: 'api/login/POST.js',
      mockDir,
      fileContent: `
        exports.enable = false;
        exports.mock = () => ({})
      `,
    });
    await server.init();
    await server.serve();
    const res = await axios.request({
      method: 'POST',
      url: `http://localhost:${port}/api/login`,
    });
    expect(res.data).toEqual('');
  });

  it('mock function data should work', async () => {
    const data = { code: 'OK' };
    await createMockFile({
      mockDir,
      mockFilepath: 'api/login/POST.js',
      fileContent: `
      exports.enable = true;
        exports.mock = () => ({
          data: ${JSON.stringify(data)}
        })
        `,
    });
    await server.init();
    await server.serve();
    const res = await axios.request({
      method: 'POST',
      url: `http://localhost:${port}/api/login`,
    });
    expect(res.data).toEqual(data);
  });

  it('mock function delay should work', async () => {
    const delay = 200;
    await createMockFile({
      mockDir,
      mockFilepath: 'api/login/POST.js',
      fileContent: `
        exports.enable = true;
        exports.mock = () => ({
          data: {},
          delay: ${delay},
        })
      `,
    });
    await server.init();
    await server.serve();
    const start = Date.now();
    await axios.request({
      method: 'POST',
      url: `http://localhost:${port}/api/login`,
    });
    const end = Date.now();
    expect(end - start).toBeGreaterThan(delay);
  });

  it('mock function statusCode should work', async () => {
    const statusCode = 400;
    await createMockFile({
      mockDir,
      mockFilepath: 'api/login/POST.js',
      fileContent: `
        exports.enable = true;
        exports.mock = () => ({
          data: {},
          statusCode: 400,
        })
      `,
    });
    await server.init();
    await server.serve();
    try {
      await axios.request({
        method: 'POST',
        url: `http://localhost:${port}/api/login`,
      });
    } catch (err) {
      expect((err as any).response.status).toBe(statusCode);
    }
  });

  it('mock function headers should work', async () => {
    const headers = { 'custom-header': 'custom-value' };
    await createMockFile({
      mockDir,
      mockFilepath: 'api/login/POST.js',
      fileContent: `
        exports.enable = true;
        exports.mock = () => ({
          data: {},
          headers: ${JSON.stringify(headers)}
        })
      `,
    });
    await server.init();
    await server.serve();
    const res = await axios.request({
      method: 'POST',
      url: `http://localhost:${port}/api/login`,
    });
    expect(res.headers['custom-header']).toEqual(headers['custom-header']);
  });

  it('dynamic mock file should work', async () => {
    await createMockFile({
      mockDir,
      mockFilepath: 'api/user/1/POST.js',
      fileContent: `
        exports.enable = true;
        exports.mock = () => ({
          data: {},
        })
      `,
    });
    await server.init();
    await server.serve();
    const res = await axios.request({
      method: 'POST',
      url: `http://localhost:${port}/api/user/1`,
    });
    expect(res.data).toEqual({});
  });

  it('mock function should get dynamic params', async () => {
    const params = {
      userID: '1',
      groupID: '2',
    };
    await createMockFile({
      mockDir,
      mockFilepath: 'api/group/{groupID}/user/{userID}/POST.js',
      fileContent: `
        exports.enable = true;
        exports.mock = ({ params }) => ({
          data: params,
        })
      `,
    });
    await server.init();
    await server.serve();
    const res = await axios.request({
      method: 'POST',
      url: `http://localhost:${port}/api/group/${params.groupID}/user/${params.userID}`,
    });
    expect(res.data).toEqual(params);
  });

  it('mock function should get request body', async () => {
    await createMockFile({
      mockDir,
      mockFilepath: 'api/login/POST.js',
      fileContent: `
        exports.enable = true;
        exports.mock = ({ body }) => ({
          data: body,
        })
        `,
    });
    await server.init();
    await server.serve();
    const data = { username: 'admin' };
    const res = await axios.request({
      method: 'POST',
      url: `http://localhost:${port}/api/login`,
      data,
    });
    expect(res.data).toEqual(data);
  });

  it('mock function should get method', async () => {
    await createMockFile({
      mockDir,
      mockFilepath: 'api/login/POST.js',
      fileContent: `
        exports.enable = true;
        exports.mock = ({ method }) => ({
          data: method,
        })
        `,
    });
    await server.init();
    await server.serve();
    const res = await axios.request({
      method: 'POST',
      url: `http://localhost:${port}/api/login`,
    });
    expect(res.data).toBe('POST');
  });

  it('mock function should get query', async () => {
    await createMockFile({
      mockDir,
      mockFilepath: 'api/login/POST.js',
      fileContent: `
        exports.enable = true;
        exports.mock = ({ query }) => ({
          data: query,
        })
        `,
    });
    await server.init();
    await server.serve();
    const res = await axios.request({
      method: 'POST',
      url: `http://localhost:${port}/api/login?username=admin&remember`,
    });
    expect(res.data).toEqual({
      username: 'admin',
      remember: '',
    });
  });

  it('mock function should get headers', async () => {
    await createMockFile({
      mockDir,
      mockFilepath: 'api/login/POST.js',
      fileContent: `
        exports.enable = true;
        exports.mock = ({ headers }) => ({
          data: headers,
        })
        `,
    });
    await server.init();
    await server.serve();
    const headers = { 'custom-key': 'custom-value' };
    const res = await axios.request({
      method: 'POST',
      url: `http://localhost:${port}/api/login`,
      headers,
    });
    expect(res.data['custom-key']).toBe(headers['custom-key']);
  });

  it('mock file created after initing plugin should work', async () => {
    await server.init();
    await server.serve();
    const data = { code: 'OK' };
    await createMockFile({
      mockDir,
      mockFilepath: 'api/login/POST.js',
      fileContent: `
        exports.enable = true;
        exports.mock = () => ({
          data: ${JSON.stringify(data)}
        })
      `,
    });
    // file watcher need time
    await new Promise((resolve) => setTimeout(resolve, 200));
    const res = await axios.request({
      method: 'POST',
      url: `http://localhost:${port}/api/login`,
    });
    expect(res.data).toEqual(data);
  });

  it('multi mock file should work', async () => {
    const dataGet = { data: 'GET /api/users' };
    await createMockFile({
      mockDir,
      mockFilepath: 'api/users/GET.js',
      fileContent: `
        exports.enable = true;
        exports.mock = () => ({
          data: ${JSON.stringify(dataGet)}
        })
      `,
    });
    const dataPost = { data: 'POST /api/users' };
    await createMockFile({
      mockDir,
      mockFilepath: 'api/users/POST.js',
      fileContent: `
        exports.enable = true;
        exports.mock = () => ({
          data: ${JSON.stringify(dataPost)}
        })
      `,
    });
    await server.init();
    await server.serve();
    const resGet = await axios.request({
      method: 'GET',
      url: `http://localhost:${port}/api/users`,
    });
    expect(resGet.data).toEqual(dataGet);
    const resPost = await axios.request({
      method: 'POST',
      url: `http://localhost:${port}/api/users`,
    });
    expect(resPost.data).toEqual(dataPost);
  });

  it('mock function can be async', async () => {
    const delay = 200;
    await createMockFile({
      mockDir,
      mockFilepath: 'api/login/POST.js',
      fileContent: `
        exports.enable = true;
        exports.mock = async () => {
          await new Promise(resolve => setTimeout(resolve, ${delay}))
          return {
            data: {},
          };
        }
      `,
    });
    await server.init();
    await server.serve();
    const start = Date.now();
    await axios.request({
      method: 'POST',
      url: `http://localhost:${port}/api/login`,
    });
    const end = Date.now();
    expect(end - start).toBeGreaterThan(delay);
  });

  it('mock file method should be case ignore', async () => {
    await createMockFile({
      mockDir,
      mockFilepath: 'api/login/Post.js',
      fileContent: `
        exports.enable = true;
        exports.mock = () => ({
          data: {},
        })
      `,
    });
    await server.init();
    await server.serve();
    const res = await axios.request({
      method: 'POST',
      url: `http://localhost:${port}/api/login`,
    });
    expect(res.data).toEqual({});
  });
});

describe('mock plugin extra logic', () => {
  let server: FeDevServer;
  let port: number;
  let mockDir: string;

  beforeEach(async () => {
    temp.track();
    port = await getPort();
    mockDir = temp.mkdirSync('mock');
  });

  afterEach(async () => {
    await server.close();
    temp.cleanupSync();
  });

  it('mockFilepathFormatter should work', async () => {
    server = new FeDevServer({
      port,
      plugins: [
        new MockPlugin({
          cfg: {
            mockDir,
            mockFilepathFormatter: ({ pathname, search }) => `${pathname}/${search._method}.js`,
          },
        }),
      ],
    });
    await createMockFile({
      mockDir,
      mockFilepath: 'api/login/POST.js',
      fileContent: `
        exports.enable = true;
        exports.mock = () => ({
          data: {},
        })
      `,
    });
    await server.init();
    await server.serve();
    const res = await axios.request({
      method: 'GET',
      url: `http://localhost:${port}/api/login?_method=POST`,
    });
    expect(res.data).toEqual({});
  });
});
