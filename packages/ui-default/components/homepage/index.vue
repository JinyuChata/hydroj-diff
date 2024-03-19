<template>
  <!-- 轮播图 -->
  <div>
    <el-carousel :interval="5000" arrow="always" height="300px">
      <el-carousel-item
        class="el-carousel__item"
        v-for="item in carouselItems"
        :key="item.id"
      >
        <img :src="item.imageUrl" class="carousel-image" alt="轮播图" />
      </el-carousel-item>
    </el-carousel>
    <div>
      <div class="title" style="margin: 10px 0 5px 0">
        <div style="display: flex; height: 50px; line-height: 50px" class="w">
          <div
            style="
              font-size: 20px;
              font-weight: 700;
              margin-left: 30px;
              position: relative;
            "
          >
            CODEMATE
            <div class="titleBorder"></div>
          </div>
          <span
            style="
              font-size: 20px;
              color: #333;
              margin-left: 15px;
              font-weight: 400;
            "
            >修炼场</span
          >
        </div>
      </div>
      <div class="bottom w" style="display: flex">
        <div class="bottomCenter" style="flex: 1">
          <el-tabs v-model="icompetition" @tab-click="tabChange">
            <el-tab-pane label="赛事题库" name="赛事题库"> </el-tab-pane>
            <el-tab-pane label="GESP考级" name="GESP考级"> </el-tab-pane>
            <el-tab-pane label="电子学会" name="电子学会"> </el-tab-pane>
            <el-tab-pane label="蓝桥杯" name="蓝桥杯"> </el-tab-pane>
            <el-tab-pane label="按标签筛选" name="fonv">
              <el-dialog
                :visible.sync="dialogVisible"
                width="850px"
                :before-close="handleClose"
              >
                <div
                  class="dialogTitle"
                  style="color: #a5a5a5; margin-top: 10px"
                >
                  请选择标签(已选择0个标签)
                </div>
                <div style="display: flex; flex-wrap: wrap" class="dialogBody">
                  <div
                    v-for="(subcategories, categoryName) in categories"
                    :key="categoryName"
                    :style="
                      categorySelect == categoryName
                        ? selectedStyle
                        : unselectedStyle
                    "
                    @click="categorySelect = categoryName"
                  >
                    {{ categoryName }}
                  </div>
                </div>

                <div
                  v-for="(subcategories, categoryName) in categories"
                  :key="categoryName"
                  v-if="categoryName == categorySelect"
                >
                  <div
                    v-for="subcategory in subcategories"
                    :key="Object.keys(subcategory)[0]"
                  >
                    <div
                      class="dialogTitle"
                      style="color: #a5a5a5; margin-top: 50px"
                    >
                      {{ Object.keys(subcategory)[0] }}
                    </div>
                    <div
                      style="display: flex; flex-wrap: wrap"
                      class="dialogBody"
                    >
                      <div
                        v-for="option in subcategory[
                          Object.keys(subcategory)[0]
                        ]"
                        :key="option.name"
                        @click="toggleSelection(option)"
                        :style="
                          option.selected ? selectedStyle : unselectedStyle
                        "
                      >
                        {{ option.name }}
                      </div>
                    </div>
                  </div>
                </div>
                <span
                  slot="footer"
                  class="dialog-footer"
                  style="display: flex; justify-content: center"
                >
                  <el-button
                    type="primary"
                    @click="clickOk"
                    style="background-color: #ff7d37; color: #fff; border: none"
                    >确 认</el-button
                  >
                </span>
              </el-dialog>
            </el-tab-pane>
          </el-tabs>
          <el-tabs v-model="ilevel" style="max-width: 970px">
            <el-tab-pane
              v-for="(level, index) in this.subLevelList"
              :label="level"
              :name="level"
              >{{ level }}
            </el-tab-pane>
          </el-tabs>
          <div
            v-if="icompetition == 'fonv'"
            style="margin-bottom: 20px; margin-top: -10px"
          >
            <div style="display: flex; flex-wrap: wrap" class="dialogBody">
              <template
                v-for="(subcategories, categoryName) in categories"
                :key="categoryName"
              >
                <template
                  v-for="subcategory in subcategories"
                  :key="Object.keys(subcategory)[0]"
                >
                  <div
                    v-for="option in subcategory[Object.keys(subcategory)[0]]"
                    :key="option.name"
                    @click="toggleSelection(option)"
                    :style="option.selected ? selectedStyle : unselectedStyle"
                    v-if="option.selected"
                  >
                    {{ option.name }}
                  </div>
                </template>
              </template>
            </div>
          </div>

          <el-table
            :data="tableData"
            style="width: 100%; cursor: pointer"
            @row-click="handleRowClick1"
            v-show="tableData.length > 0"
          >
            <el-table-column prop="pid" label="编号" width="100">
            </el-table-column>
            <el-table-column prop="title" label="题目名称" width="300">
              <template slot-scope="scope">
                <div>
                  <span style="font-size: 16px; font-weight: 700">
                    {{ scope.row.title }}
                  </span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="tag" label="算法标签" width="280">
              <template slot-scope="scope">
                <div>
                  <el-tag
                    type="warning"
                    style="
                      margin: 4px;
                      padding: 0 10px;
                      color: #ff7d37;
                      border: 1px solid #ff7d37;
                    "
                    v-for="(item, index) in scope.row.tag"
                    :key="index"
                  >
                    {{ item }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="difficulty" label="难度" width="65">
            </el-table-column>
            <el-table-column prop="nSubmit" label="尝试" width="65">
            </el-table-column>
            <el-table-column prop="nAccept" label="AC" width="80">
            </el-table-column>
            <el-table-column prop="hot" width="130" label="热度">
            </el-table-column>
          </el-table>
          <div class="paginationRoot">
            <div class="backPage">
              <span
                style="margin-right: 10px"
                class="pageText"
                @click="handleCurrentChange(1)"
                >首页</span
              >
              <span
                class="pageText"
                @click="handleCurrentChange(currentPage - 1)"
                >上一页</span
              >
            </div>
            <el-pagination
              @current-change="handleCurrentChange"
              :current-page="currentPage"
              layout=" prev, pager, next"
              :total="pcount"
              :page-size="15"
            >
            </el-pagination>
            <div class="nextPage">
              <span
                class="pageText"
                @click="handleCurrentChange(currentPage + 1)"
                >下一页</span
              >
              <span
                style="margin-left: 10px"
                class="pageText"
                @click="handleCurrentChange(-1)"
                >末页</span
              >
            </div>
          </div>
        </div>
        <div class="bottomRight" style="width: 300px">
          <el-collapse v-model="activeNames">
            <el-collapse-item name="1">
              <template slot="title">
                <div style="display: flex; align-items: center">
                  <div
                    style="
                      width: 4px;
                      background-color: #ff7d37;
                      height: 18px;
                      margin: 10px;
                    "
                  ></div>
                  <span>重要公告</span>
                </div>
              </template>
              <div style="padding: 10px">
                可以折叠/展开的内容区域，用于对复杂区域进行分组和隐藏，保持页面的整洁。
              </div>
              <div style="padding: 10px">
                可以折叠/展开的内容区域，用于对复杂区域进行分组和隐藏，保持页面的整洁。
              </div>
            </el-collapse-item>
            <el-collapse-item name="2">
              <template slot="title">
                <div style="display: flex; align-items: center">
                  <div
                    style="
                      width: 4px;
                      background-color: #ff7d37;
                      height: 18px;
                      margin: 10px;
                    "
                  ></div>
                  <span>重要公告</span>
                </div>
              </template>
              <div style="padding: 10px">
                可以折叠/展开的内容区域，用于对复杂区域进行分组和隐藏，保持页面的整洁。
              </div>
              <div style="padding: 10px">
                可以折叠/展开的内容区域，用于对复杂区域进行分组和隐藏，保持页面的整洁。
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
      <div class="tabsAll" style="width: 130px">
        <div
          v-for="tab in tabs"
          :key="tab.name"
          @click="selectTab(tab.name)"
          :style="{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 15px',
            boxSizing: 'border-box',
            width: '101px',
            height: '51px',
            lineHeight: '51px',
            fontSize: '14px',
            marginTop: '15px',
          }"
          :class="{ highlight: ilanguage === tab.name }"
          class="side-tabs"
        >
          <div v-if="tab.name === '全部'">全部</div>
          <div v-if="tab.name === 'C++'">C++</div>
          <div v-if="tab.name === 'Python'">Python</div>
          <div v-if="tab.name === '图形化'">图形化</div>
          <div>
            <i class="iconfont el-icon-caret-right"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      categorySelect: "按题型",
      categories: {
        按题型: [
          {
            语言入门: [
              { name: "GESP:一级", selected: false },
              { name: "变量和类型", selected: false },
              { name: "循环结构", selected: false },
            ],
          },
          {
            字符串: [
              { name: "字符串处理", selected: false },
              { name: "字符串匹配", selected: false },
              { name: "正则表达式", selected: false },
            ],
          },
          // 其他按题型的二级分类...
        ],
        按来源: [
          {
            高校课程: [
              { name: "计算机基础", selected: false },
              { name: "算法导论", selected: false },
            ],
          },
          {
            在线竞赛: [
              { name: "LeetCode", selected: false },
              { name: "Codeforces", selected: false },
            ],
          },
          // 其他按来源的二级分类...
        ],
        按时间: [
          {
            "2021年": [
              { name: "上半年", selected: false },
              { name: "下半年", selected: false },
            ],
          },
          {
            "2022年": [
              { name: "上半年", selected: false },
              { name: "下半年", selected: false },
            ],
          },
          // 其他按时间的二级分类...
        ],
        // 其他一级分类...
      },
      sections: [
        {
          title: "请选择标签(已选择0个标签)",
          items: [
            { name: "按知识点", selected: false },
            { name: "按年份", selected: false },
          ],
        },
        // 其他 sections...
      ],
      selectedStyle: {
        padding: "0 15px",
        marginTop: "10px",
        lineHeight: "30px",
        border: "1px solid #f1f1f1",
        marginRight: "15px",
        borderRadius: "10px",
        color: "#fff", // 选中时的字体颜色
        backgroundColor: "#ff7d37", // 选中时的背景颜色
      },
      unselectedStyle: {
        padding: "0 15px",
        marginTop: "10px",
        lineHeight: "30px",
        border: "1px solid #f1f1f1",
        marginRight: "15px",
        borderRadius: "10px",
        color: "#000", // 未选中时的字体颜色
        backgroundColor: "#fff", // 未选中时的背景颜色
      },
      activeNames: ["1", "2"],
      pcount: 0,
      currentPage: 1,
      ilanguage: "全部",
      icompetition: "赛事库题",
      ilevel: "全部",
      tableData: [],
      ilevelList: {
        赛事题库: ["粤港澳信息学创新大赛-创意程序开发闯关竞赛"],
        GESP考级: [
          "一级",
          "二级",
          "三级",
          "四级",
          "五级",
          "六级",
          "七级",
          "八级",
        ],
        电子学会: [
          "1级",
          "2级",
          "3级",
          "4级",
          "5级",
          "6级",
          "7级",
          "8级",
          "9级",
          "10级",
        ],
        蓝桥杯: [
          "1级",
          "2级",
          "3级",
          "4级",
          "5级",
          "6级",
          "7级",
          "8级",
          "9级",
          "10级",
          "11级",
          "12级",
          "13级",
          "14级",
          "15级",
          "16级",
          "17级",
          "18级",
        ],
      },
      tabs: [
        { name: "全部", color: "#000", backgroundColor: "#f7f5f5" },
        { name: "图形化", color: "#000", backgroundColor: "#f7f5f5" },
        { name: "C++", color: "#000", backgroundColor: "#f7f5f5" },
        { name: "Python", color: "#000", backgroundColor: "#f7f5f5" },
        // ... other tabs
      ],
      dialogVisible: false,
      sections: [
        {
          title: "年份",
          items: [
            { name: "2012", selected: false },
            { name: "2013", selected: false },
            { name: "2014", selected: false },
            { name: "2015", selected: false },
          ],
        },
        {
          title: "知识点",
          items: [
            { name: "二分", selected: false },
            { name: "线段树", selected: false },
            { name: "贪心", selected: false },
            { name: "动态规划", selected: false },
          ],
        },
        // 其他 sections...
      ],
      carouselItems: [
        {
          id: 1,
          imageUrl: `/img/lunbotu/lunbotu.jpg`,
        },
        {
          id: 2,
          imageUrl: `/img/lunbotu/lunbotu.jpg`,
        },
        {
          id: 3,
          imageUrl: `/img/lunbotu/lunbotu.jpg`,
        },
        {
          id: 4,
          imageUrl: `/img/lunbotu/lunbotu.jpg`,
        },
      ],
    };
  },
  watch: {
    ilanguage: function () {
      this.refresh_page();
    },
    icompetition: function () {
      this.ilevel = "全部";
      this.refresh_page();
    },
    ilevel: function () {
      this.refresh_page();
    },
  },
  computed: {
    subLevelList: function () {
      console.log(this.icompetition);
      console.log(this.ilevelList[this.icompetition]);
      return this.ilevelList[this.icompetition];
    },
  },
  methods: {
    handleCurrentChange(val) {
      if (val === -1) {
        val = Math.ceil(this.pcount / 15);
      }
      if (val >= 1 && val <= Math.ceil(this.pcount / 15)) {
        this.currentPage = val;
        this.refresh_page();
      }
    },
    toggleSelection(item) {
      item.selected = !item.selected;
    },
    tabChange() {
      this.ilevel = "";
      console.log(this.tabs);
      if (this.icompetition === "fonv") {
        this.dialogVisible = true;
      }
    },
    selectTab(tabName) {
      this.ilanguage = tabName;
    },
    clickOk() {
      this.dialogVisible = false;
      // TODO 传参进refresh_page
    },
    refresh_page: function () {
      console.log([this.ilanguage, this.icompetition, this.ilevel]);
      const queries = [];
      if (this.ilanguage !== "" && this.ilanguage !== "全部") {
        queries.push(`ilanguage=${encodeURIComponent(this.ilanguage)}`);
      }
      if (this.icompetition !== "" && this.icompetition !== "赛事库题") {
        queries.push(`icompetition=${encodeURIComponent(this.icompetition)}`);
      }
      if (this.ilevel !== "" && this.ilevel !== "全部") {
        queries.push(`ilevel=${encodeURIComponent(this.ilevel)}`);
      }
      queries.push(`page=${this.currentPage}`);

      const url = `/p-tag/api?${queries.join("&")}`;

      console.log(url);
      // 发送请求获取JSON数据
      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          this.tableData = data["pdocs"]; // 填入tableData中
          this.pcount = data["pcount"];
          this.tableData.forEach((element) => {
            // 如果pid字段为空，则修改pid字段
            if (!element.pid) {
              element.pid = "P" + element.docId.toString();
            }

            // 根据nSubmit字段计算hot字段，每20个提交对应一个🔥，至少1个🔥，最多6个🔥
            const hotCount = Math.max(
              Math.min(Math.floor(element.nSubmit / 20), 6),
              1,
            );
            element.hot = "🔥".repeat(hotCount);

            // 如果difficulty字段为空，则计算并四舍五入其值为整数
            if (!element.difficulty) {
              const nSubmit = element.nSubmit;
              const nAccept = element.nAccept;
              const difficultyValue = Math.round(
                Math.max(Math.min(nSubmit / (nAccept + 1), 10), 1),
              );
              element.difficulty = difficultyValue;
            }
          });
          console.log(this.tableData);
          let idx = -1;
          this.$nextTick(() => {
            document.querySelectorAll(".el-table__row").forEach((item) => {
              console.log("document", item);
              idx = idx + 1;
              if (
                typeof this.tableData[idx].brief === "string" &&
                this.tableData[idx].brief !== ""
              )
                item.insertAdjacentHTML(
                  "afterend",
                  `<div class="tableText" style="width:990px;font-size:15px;padding-bottom:20px;border-bottom:1px solid #F1F1F1;">${this.tableData[idx].brief}</div>`,
                );
            });
          });
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
        });
    },
    tabsFn: function (lang) {
      console.log(lang);
      this.ilanguage = lang;
      this.refresh_page();
    },
    handleRowClick1: function (row, column, event) {
      // Navigate to the URL composed of '/p/' and the pid of the clicked row
      console.log("gogo", row.pid);
      // this.$router.push('/p/' + row.pid);
      // window.open('/p/' + row.docId.toString(), '_blank');
      location.href = "/p/" + row.docId.toString();
    },
  },
  mounted() {
    this.refresh_page();
  },
};
</script>

<style scoped>
.side-tabs {
  display: flex;
  justify-content: space-between;
  padding: 0 15px;
  width: 101px;
  height: 51px;
  font-size: 14px;
  margin-top: 15px;
}

.side-tabs.highlight {
  background-color: #ff7d37;
  color: #fff;
}

.has-gutter {
  background-color: #f9f9f9 !important;
}

#root {
  background: #fff;
  padding-top: 10px;
}

/* 版心 */
.w {
  width: 1280px;
  margin: 0 auto;
}

header {
  background-color: #fff;
  position: sticky;
  top: 0;
  width: 100%;
  z-index: 998;
  height: 75px;
}

header .header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header #logo {
  height: 75px;
}

.header-center {
  flex: 1;
  margin-left: 130px;
}

.header-center ul {
  display: flex;
}

.header-center ul li {
  margin: 0 10px;
  position: relative;
  height: 35px;
  line-height: 35px;
  cursor: pointer;
}

.el-carousel__item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  .carousel-image {
    max-width: 100%;
    max-height: 100%;
  }
}

.liActive {
  color: #ff7d37;
  font-weight: 600;
}

.header-center ul .liActive::before {
  content: "";
  /* 必须有内容才能显示伪元素 */
  position: absolute;
  left: 50%;
  bottom: 0;
  /* 放在底部 */
  width: 50%;
  /* 宽度等于父元素宽度 */
  border-bottom: 3px solid #ff7d37;
  /* 边框样式不变 */
  transform: translateX(-50%);
  /* 将元素向左移动自身宽度的一半，实现居中 */
}

.header-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.header-right .Avatar img {
  border-radius: 50%;
}

.header-right .inputBox {
  background-color: #fff;
  padding: 5px 10px;
  width: 100px;
  margin: 0 20px;
  border: 1px solid #ccc;
  font-size: 12px;
}

.header-right input {
  border: none;
  outline: none;
  font-size: 12px;
  width: 100%;
}

.el-tabs__item:hover {
  color: #ff7d37;
  cursor: pointer;
}

.is-active {
  color: #ff7d37 !important;
}

.el-tabs__active-bar {
  background-color: #ff7d37;
}

.el-collapse {
  border-top: none;
}

.el-carousel__item h3 {
  color: #d8d8d8;
  font-size: 14px;
  opacity: 0.75;
  line-height: 200px;
  margin: 0;
}

/*.el-carousel__item:nth-child(2n) {*/
/*  background-color: #d8d8d8;*/
/*}*/

/*.el-carousel__item:nth-child(2n + 1) {*/
/*  background-color: #d8d8d8;*/
/*}*/

.footer {
  display: flex;
  padding-top: 40px;
}

.footer-right {
  display: flex;
  justify-content: space-between;
  flex: 1;
  margin-left: 90px;
  font-size: 16px;
}

.footer-right .rightItem {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.footer-right .rightItem p {
  color: #000;
}

.footer-right .rightItem div {
  margin-top: 10px;
  color: #797979;
}

.tabsAll {
  position: fixed;
  /* 居中靠左 */
  left: 0;
  top: 50%;
}

.side-tabs {
  /* 矩形 42 */
  width: 153px;
  height: 60px;
  border-radius: 0px 40px 40px 0px;
  opacity: 1;
  color: #000000;
  background-color: #ffffff;
  box-shadow: 4px 2px 10px 0px #fff0e7;
  z-index: 1000;
  margin-top: 8px;
  cursor: pointer;
}

.titleBorder {
  position: absolute;
  top: 33px;
  width: 114px;
  height: 4px;
  opacity: 1;
  background: #ff7d37;
}

.paginationRoot {
  display: flex;
  width: 100%;
  margin-top: 30px;
  align-items: center;
  color: #3d3d3d;
  justify-content: center;
}

.el-pager li.active {
  color: #ff7d37;
  cursor: default;
}

.el-pager li:hover {
  color: #ff7d37;
  cursor: default;
}

.pageText:hover {
  color: #ff7d37;
  cursor: pointer;
}

a {
  text-decoration: none;
  color: inherit; /* 显式声明继承颜色 */
  font-size: inherit; /* 显式声明继承字体大小 */
  font-family: inherit; /* 显式声明继承字体 */
}
</style>
