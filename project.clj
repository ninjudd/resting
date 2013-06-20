(defproject org.flatland/resting "0.1.0-SNAPSHOT"
  :description "Simple ref-backed restful resources."
  :url "https://github.com/flatland/resting"
  :license {:name "Eclipse Public License"
            :url "http://www.eclipse.org/legal/epl-v10.html"}
  :dependencies [[org.clojure/clojure "1.5.1"]
                 [compojure "1.1.5"]
                 [cheshire "5.0.1"]
                 [org.flatland/ring-middleware-format "0.3.1"]]
  :plugins [[lein-ring "0.8.2"]]
  :ring {:handler flatland.resting.example/handler
         :open-browser? false})
