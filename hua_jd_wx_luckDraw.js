let mode = __dirname.includes('magic')
const {Env} = mode ? require('../magic') : require('./magic')
const $ = new Env('M幸运抽奖');
$.lz = 'LZ_TOKEN_KEY=lztokef1eb8494b0af868bd18bdaf8;LZ_TOKEN_VALUE=Aa5RE8RuY4X3zA==;';
$.activityUrl = process.env.M_WX_LUCK_DRAW_URL
    ? process.env.M_WX_LUCK_DRAW_URL
    : '';
if (mode) {
    $.activityUrl = 'https://lzkj-isv.isvjcloud.com/lzclient/8e5f3ebaf6e545959aa6311d14be5dfa/cjwx/common/entry.html?activityId=8e5f3ebaf6e545959aa6311d14be5dfa&gameType=wxTurnTable'
    // $.activityUrl = 'https://lzkj-isv.isvjcloud.com/wxDrawActivity/activity?activityId=37c4c35255a84522bc944974edeef960'
    // $.activityUrl = 'https://lzkj-isv.isvjcloud.com/wxDrawActivity/activity?activityId=1155ac7d4ec74a8ba31238d846866599'
    $.activityUrl = 'https://lzkj-isv.isvjcloud.com/wxDrawActivity/activity?activityId=a5b7b7b8196e4dc192c4ffd3221a7866'
    $.activityUrl = 'https://lzkj-isv.isvjcloud.com/lzclient/99553680fae741fd81498c81de17dcf2/cjwx/common/entry.html?activityId=99553680fae741fd81498c81de17dcf2&gameType=wxTurnTable'
    $.activityUrl = 'https://cjhy/wxDrawActivity/activity?activityId=8af91b45f0334243a1c5dac1882a4756'
    $.activityUrl = 'https://cjhy/wxDrawActivity/activity?activityId=14b73406906c4d25b90979c1127d4adc'
}
$.domain = $.activityUrl.match(/https?:\/\/([^/]+)/) && $.activityUrl.match(/https?:\/\/([^/]+)/)[1] || ''
$.activityUrl = $.activityUrl.replace("#", "&")
$.activityId = $.getQueryString($.activityUrl, 'activityId')
let stop = false;
let shopInfo = ''
$.logic = async function () {
    if (stop) {
        return;
    }
    if (!$.activityId || !$.activityUrl) {
        stop = true;
        $.putMsg(`activityId|activityUrl不存在`);
        return
    }
    $.log(`活动id: ${$.activityId}`, `活动url: ${$.activityUrl}`)
    $.UA = `jdapp;iPhone;10.2.2;13.1.2;${$.uuid()};M/5.0;network/wifi;ADID/;model/iPhone8,1;addressid/2308460611;appBuild/167863;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1;`

    let token = await $.isvObfuscator();
    if (token.code !== '0') {
        $.putMsg(`获取Token失败`);
        return
    }
    $.Token = token?.token

    let actInfo = await $.api('customer/getSimpleActInfoVo',
        `activityId=${$.activityId}`);
    if (!actInfo.result || !actInfo.data) {
        $.log(`获取活动信息失败`);
        return
    }
    $.venderId = actInfo.data.venderId;
    $.shopId = actInfo.data.shopId;
    $.activityType = actInfo.data.activityType;

    let myPing = await $.api('customer/getMyPing',
        `userId=${$.venderId}&token=${$.Token}&fromType=APP`)
    if (!myPing.result) {
        $.putMsg(`获取pin失败`);
        return
    }
    $.Pin = myPing.data.secretPin;

    shopInfo = await $.api('wxDrawActivity/shopInfo',
        `activityId=${$.activityId}`, true);
    if (!shopInfo.result) {
        $.putMsg('获取不到店铺信息,结束运行')
        return
    }
    $.shopName = shopInfo?.data?.shopName
    await $.api(
        `common/${$.domain.includes('cjhy') ? 'accessLog' : 'accessLogWithAD'}`,
        `venderId=${$.venderId}&code=${$.activityType}&pin=${encodeURIComponent(
            $.Pin)}&activityId=${$.activityId}&pageUrl=${$.activityUrl}&subType=app&adSource=`);
    let activityContent = await $.api(
        `${$.activityType===26?'wxPointDrawActivity':'wxDrawActivity'}/activityContent`,
        `activityId=${$.activityId}&pin=${encodeURIComponent(
            $.Pin)}`, true);
    if (!activityContent.result && !activityContent.data) {
        $.putMsg(activityContent.errorMessage || '活动可能已结束')
        return
    }
    debugger
    $.hasFollow = activityContent.data.hasFollow || ''
    $.needFollow = activityContent.data.needFollow || false
    $.canDrawTimes = activityContent.data.canDrawTimes || 0
    $.content = activityContent.data.content || []
    $.drawConsume = activityContent.data.drawConsume || 0
    // if ($.canDrawTimes === 0) {
    //     $.putMsg(`抽奖次数 ${$.canDrawTimes}`)
    //     return
    // }
    debugger
    let memberInfo = await $.api($.domain.includes('cjhy')
            ? 'mc/new/brandCard/common/shopAndBrand/getOpenCardInfo'
            : 'wxCommonInfo/getActMemberInfo',
        $.domain.includes('cjhy')
            ? `venderId=${$.venderId}&buyerPin=${encodeURIComponent(
                encodeURIComponent($.Pin))}&activityType=${$.activityType}` :
            `venderId=${$.venderId}&activityId=${$.activityId}&pin=${encodeURIComponent(
                $.Pin)}`);
    //没开卡 需要开卡
    if ($.domain.includes('cjhy')) {
        //没开卡 需要开卡
        if (memberInfo.result && !memberInfo.data?.openCard
            && memberInfo.data?.openCardLink) {
            $.putMsg('需要开卡，跳过')
            return
        }
    }else {
        if (memberInfo.result && !memberInfo.data?.openCard
            && memberInfo.data?.actMemberStatus === 1) {
            $.putMsg('需要开卡，跳过')
            return
        }
    }

    if ($.needFollow && !$.hasFollow) {
        let followShop = await $.api($.domain.includes('cjhy')
                ? 'wxActionCommon/newFollowShop'
                : 'wxActionCommon/followShop',
            $.domain.includes('cjhy')
                ? `venderId=${$.venderId}&activityId=${$.activityId}&buyerPin=${encodeURIComponent(
                    encodeURIComponent($.Pin))}&activityType=${$.activityType}`
                : `userId=${$.venderId}&activityId=${$.activityId}&buyerNick=${encodeURIComponent(
                    $.Pin)}&activityType=${$.activityType}`);
        if (!followShop.result) {
            $.putMsg(followShop.errorMessage)
            return;
        }
        await $.wait(1000);
    }
    for (let m = 1; $.canDrawTimes--; m++) {
        let prize = await $.api(`${$.activityType === 26?'wxPointDrawActivity':'wxDrawActivity'}/start`,
            $.domain.includes('cjhy')
                ? `activityId=${$.activityId}&pin=${encodeURIComponent(
                    encodeURIComponent($.Pin))}`
                : `activityId=${$.activityId}&pin=${encodeURIComponent(
                    $.Pin)}`);
        if (prize.result) {
            $.canDrawTimes = prize.data.canDrawTimes
            let msg = prize.data.drawOk ? prize.data.name
                : prize.data.errorMessage || '空气';
            $.putMsg(msg)
        } else {
            if (prize.errorMessage) {
                $.putMsg(`${prize.errorMessage}`);
                if (prize.errorMessage.includes('来晚了')
                    || prize.errorMessage.includes('已发完')
                    || prize.errorMessage.includes('活动已结束')) {
                    stop = true;
                }
            }
            break
        }
        await $.wait(parseInt(Math.random() * 500 + 1500, 10));
        if (!$.shopName.includes('蓝月亮')){
            if (Number($.canDrawTimes) <= 0 || m >= 5) {
                break
            }
        }
    }
    await $.unfollow($.shopId)
}
$.after = async function () {
    if ($.msg.length > 0) {
        let message = `\n${$.shopName || ''}\n`;
        for (let ele of $.content || []) {
            if (ele.name.includes('谢谢') || ele.name.includes('再来')) {
                continue;
            }
            message += `    ${ele.name} ${ele?.type===8?'专享价':''}\n`
        }
        $.msg.push(message)
        $.msg.push($.activityUrl);
    }
}
$.run({random: true,whitelist: ['1-5'],wait:[5000,20000]}).catch(
    reason => $.log(reason));

