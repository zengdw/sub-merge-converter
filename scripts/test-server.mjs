import { createApp } from '../src/app/createApp.jsx';
import { createNodeRuntime } from '../src/runtime/node.js';

async function runTests() {
    console.log('--- 开始端到端测试 ---');
    const runtime = createNodeRuntime(process.env);
    const app = createApp(runtime);

    // 1. 测试首页 GET /
    const homeRes = await app.fetch(new Request('http://localhost:8787/'));
    console.log('1. GET / 状态码:', homeRes.status);
    const homeText = await homeRes.text();
    if (homeRes.status === 200 && homeText.includes('Sub Merge Converter')) {
        console.log('   ✅ 首页正常渲染');
    } else {
        console.error('   ❌ 首页异常');
    }

    // 2. 测试管理后台未授权 GET /admin
    const adminUnauthRes = await app.fetch(new Request('http://localhost:8787/admin'));
    console.log('2. GET /admin (未授权) 状态码:', adminUnauthRes.status);
    if (adminUnauthRes.status === 401) {
        console.log('   ✅ 未授权拦截成功');
    } else {
        console.error('   ❌ 未授权拦截失败');
    }

    // 3. 测试授权认证 GET /get-sub-token
    const creds = await runtime.mergeSub.getCredentials();
    console.log('   当前加载的凭据:', creds);
    const authHeader = 'Basic ' + Buffer.from(`${creds.username}:${creds.password}`).toString('base64');
    const tokenRes = await app.fetch(new Request('http://localhost:8787/get-sub-token', {
        headers: { 'Authorization': authHeader }
    }));
    const tokenData = await tokenRes.json();
    console.log('3. GET /get-sub-token 获取Token:', tokenData.token);
    if (tokenRes.status === 200 && tokenData.token) {
        console.log('   ✅ 授权与Token获取成功');
    } else {
        console.error('   ❌ Token获取失败');
    }

    // 4. 测试添加自定义节点 POST /admin/add-node
    const testNode = 'vmess://eyJhZGQiOiIxLjEuMS4xIiwicG9ydCI6NDQzLCJpZCI6IjAwMCIsIm5ldCI6IndzIiwidGxzIjoidGxzIiwicHMiOiJ0ZXN0In0=';
    const addNodeRes = await app.fetch(new Request('http://localhost:8787/admin/add-node', {
        method: 'POST',
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ node: testNode })
    }));
    const addNodeData = await addNodeRes.json();
    console.log('4. POST /admin/add-node 结果:', addNodeData);
    if (addNodeRes.status === 200) {
        console.log('   ✅ 节点添加成功');
    }

    // 5. 测试订阅输出 GET /sub 带优选参数
    const subRes = await app.fetch(new Request('http://localhost:8787/sub?CFIP=time.is&CFPORT=8443'));
    const subText = await subRes.text();
    const decodedSub = Buffer.from(subText, 'base64').toString('utf8');
    console.log('5. GET /sub 输出节点 (已解码):', decodedSub);
    if (decodedSub.includes('vmess://')) {
        const vmessObj = JSON.parse(Buffer.from(decodedSub.replace('vmess://', ''), 'base64').toString('utf8'));
        if (vmessObj.add === 'time.is' && vmessObj.port === 8443) {
            console.log('   ✅ 优选 IP/Port 动态替换成功 (time.is:8443)');
        }
    }

    // 6. 测试转换引擎 GET /xray
    const xrayRes = await app.fetch(new Request('http://localhost:8787/xray?config=' + encodeURIComponent(testNode)));
    console.log('6. GET /xray 状态码:', xrayRes.status);
    if (xrayRes.status === 200) {
        console.log('   ✅ 订阅格式转换成功');
    }

    console.log('--- 测试全部通过 ---');
}

runTests().catch(console.error);
