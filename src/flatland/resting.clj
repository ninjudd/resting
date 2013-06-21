(ns flatland.resting
  (:require [compojure.core :refer [routes GET PUT DELETE PATCH]]
            [ring.middleware.format :refer [wrap-restful-format]]))

(defn file-ref [file]
  (let [ref (ref (read-string
                  (try (slurp file)
                       (catch Exception e
                         "{}"))))]
    (add-watch ref :persist
               (fn [_ _ _ new-state]
                 (locking ref
                   (spit file (pr-str new-state)))))))

(defn save! [ref value]
  (dosync
   (let [id (:id value)
         old (get @ref id)
         new (dissoc value :hash :force :id)]
     (when (or (nil? old)
               (= (:hash value) (:hash old))
               (:force value))
       (let [hashed (hash new)]
         (alter ref assoc id
                (assoc new :hash hashed))
         hashed)))))

(defn delete! [ref id]
  (dosync
   (let [old (get @ref id)]
     (alter ref dissoc id)
     old)))

(defn rename! [ref from to]
  (dosync
   (if (get @ref to)
     from
     (when-let [val (get @ref from)]
       (alter ref dissoc from)
       (alter ref assoc to val)
       to))))

(defn error [fmt & args]
  {:status 400, :body {:error (apply format fmt args)}})

(defn resting
  ([name]
     (resting name (file-ref (str name ".clj"))))
  ([name state]
     (let [state (if (string? state)
                   (file-ref state)
                   state)]
       (-> (routes (PUT (str "/" name "/:id") {attrs :params}
                        (if-let [hash (save! state attrs)]
                          {:body {:id (:id attrs), :hash hash}}
                          (error "%s has been modified by someone else." (:id attrs))))
                   (DELETE (str "/" name "/:id") [id]
                           (if-let [old (delete! state id)]
                             {:body old}
                             (error "%s not found." id)))
                   (PATCH (str "/" name "/:from") [from id]
                          (do (prn from id)
                              (if (empty? id)
                                (error "id is required")
                                (let [new (rename! state from id)]
                                  (if (= new id)
                                    {:body {:id id}}
                                    (if new
                                      (error "%s already exists; rename failed." id)
                                      (error "%s not found." from)))))))
                   (GET (str "/" name "/:id") [id]
                        {:body (when-let [data (get @state id)]
                                 (assoc data :id id))})
                   (GET (str "/" name) []
                        {:body (keys @state)}))
           (wrap-restful-format :formats [:json-kw :edn])))))
