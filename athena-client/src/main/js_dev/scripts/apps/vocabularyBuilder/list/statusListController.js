/**
 * Created by GMalikov on 30.04.2015.
 */
AthenaApp.module("VocabularyBuilder.List", function(List, AthenaApp, Backbone, Marionette, $, _){
    List.Controller = {
        listVocabularyStatuses: function(){
            var vocabStatusesPromise = AthenaApp.request("vocabStatus:entities");

            var vocabularyBuilderLayout = new AthenaApp.VocabularyBuilder.Layout.Main();

            $.when(vocabStatusesPromise).done(function(data){
                var vocabularyStatusesView = new AthenaApp.VocabularyBuilder.List.VocabStatusCollection({
                    collection: data
                });

                vocabularyBuilderLayout.on("show", function(){
                    vocabularyBuilderLayout.statusTableRegion.show(vocabularyStatusesView);
                });

                vocabularyStatusesView.on("childview:vocabStatus:build", function(childView, model){
                    alert("Starting build process");
                });

                vocabularyStatusesView.on("childview:vocabStatus:show", function(childView, model){
                    AthenaApp.VocabularyBuilder.Show.Controller.showVocabularyLog(vocabularyBuilderLayout.logTableRegion, model);
//                AthenaApp.VocabularyBuilder.Info.Controller.showVocabularyInfo(vocabularyBuilderLayout.vocabularyInfoRegion, model);
                });

                AthenaApp.mainRegion.show(vocabularyBuilderLayout);
            });
        }
    }
});