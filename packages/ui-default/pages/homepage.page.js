import Vue from "vue";
import { NamedPage } from "vj/api";
import HomePage from "vj/components/homepage/index.vue";

export default new NamedPage("homepage", () => {
  console.log("homepage - vue sfc");
  new Vue({
    el: "#root",
    template: "<HomePage />",
    components: { HomePage },
  });
});
